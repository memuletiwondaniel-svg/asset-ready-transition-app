
-- Comprehensive audit log table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  
  -- Who
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  user_name text,
  ip_address text,
  user_agent text,
  
  -- What
  category text NOT NULL, -- 'auth', 'admin', 'pssr', 'sof', 'p2a', 'vcr', 'system'
  action text NOT NULL,   -- 'login', 'approve', 'reject', 'create', 'update', 'delete', etc.
  severity text NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  
  -- Where
  entity_type text,       -- 'pssr', 'vcr', 'project', 'user', 'role', etc.
  entity_id text,         -- UUID or code of the entity
  entity_label text,      -- Human-readable label
  
  -- Details
  description text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Tenant isolation
  tenant_id uuid REFERENCES public.tenants(id)
);

-- Indexes for fast querying
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX idx_audit_logs_category ON public.audit_logs (category);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_severity ON public.audit_logs (severity);
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs (tenant_id);

-- RLS: only admins can read audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.user_is_admin(auth.uid()));

-- Allow inserts from triggers (security definer functions)
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Helper function to write audit logs from triggers
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_user_id uuid,
  p_category text,
  p_action text,
  p_severity text,
  p_entity_type text,
  p_entity_id text,
  p_entity_label text,
  p_description text,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_name text;
  v_tenant_id uuid;
BEGIN
  -- Resolve user info
  SELECT email, full_name, tenant_id
  INTO v_email, v_name, v_tenant_id
  FROM public.profiles
  WHERE user_id = p_user_id;

  INSERT INTO public.audit_logs (
    user_id, user_email, user_name,
    category, action, severity,
    entity_type, entity_id, entity_label,
    description, old_values, new_values, metadata,
    tenant_id
  ) VALUES (
    p_user_id, v_email, v_name,
    p_category, p_action, p_severity,
    p_entity_type, p_entity_id, p_entity_label,
    p_description, p_old_values, p_new_values, p_metadata,
    v_tenant_id
  );
END;
$$;

-- ============================================================
-- TRIGGER: PSSR status changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_pssr_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM write_audit_log(
      COALESCE(auth.uid(), NEW.user_id),
      'pssr', 'status_change', 'info',
      'pssr', NEW.id::text, COALESCE(NEW.pssr_id, NEW.title),
      'PSSR status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_pssr_status
  AFTER UPDATE ON public.pssrs
  FOR EACH ROW EXECUTE FUNCTION public.audit_pssr_status_change();

-- ============================================================
-- TRIGGER: PSSR approver decisions
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_pssr_approver_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('APPROVED', 'REJECTED') THEN
    PERFORM write_audit_log(
      COALESCE(NEW.user_id, auth.uid()),
      'pssr', LOWER(NEW.status), 
      CASE WHEN NEW.status = 'REJECTED' THEN 'warning' ELSE 'info' END,
      'pssr_approver', NEW.id::text, NEW.approver_role,
      'PSSR approver ' || NEW.approver_name || ' (' || NEW.approver_role || ') ' || LOWER(NEW.status) || ' the PSSR',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'comments', NEW.comments)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_pssr_approver
  AFTER UPDATE ON public.pssr_approvers
  FOR EACH ROW EXECUTE FUNCTION public.audit_pssr_approver_decision();

-- ============================================================
-- TRIGGER: SoF approver decisions
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_sof_approver_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('APPROVED', 'REJECTED') THEN
    PERFORM write_audit_log(
      COALESCE(NEW.user_id, auth.uid()),
      'sof', LOWER(NEW.status),
      CASE WHEN NEW.status = 'REJECTED' THEN 'warning' ELSE 'info' END,
      'sof_approver', NEW.id::text, NEW.approver_role,
      'SoF approver ' || NEW.approver_name || ' (' || NEW.approver_role || ') ' || LOWER(NEW.status),
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'comments', NEW.comments)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_sof_approver
  AFTER UPDATE ON public.sof_approvers
  FOR EACH ROW EXECUTE FUNCTION public.audit_sof_approver_decision();

-- ============================================================
-- TRIGGER: P2A handover approver decisions
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_p2a_approver_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('APPROVED', 'REJECTED') THEN
    PERFORM write_audit_log(
      COALESCE(NEW.user_id, auth.uid()),
      'p2a', LOWER(NEW.status),
      CASE WHEN NEW.status = 'REJECTED' THEN 'warning' ELSE 'info' END,
      'p2a_approver', NEW.id::text, NEW.role_name,
      'P2A approver ' || COALESCE(NEW.approver_name, NEW.role_name) || ' ' || LOWER(NEW.status),
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'comments', NEW.comments)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_p2a_approver
  AFTER UPDATE ON public.p2a_handover_approvers
  FOR EACH ROW EXECUTE FUNCTION public.audit_p2a_approver_decision();

-- ============================================================
-- TRIGGER: User role changes (admin actions)
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_role_name text;
  v_new_role_name text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    SELECT name INTO v_old_role_name FROM public.roles WHERE id = OLD.role;
    SELECT name INTO v_new_role_name FROM public.roles WHERE id = NEW.role;
    
    PERFORM write_audit_log(
      auth.uid(),
      'admin', 'role_change', 'warning',
      'user', NEW.user_id::text, NEW.full_name,
      'Role changed for ' || COALESCE(NEW.full_name, NEW.email) || ' from ' || COALESCE(v_old_role_name, 'none') || ' to ' || COALESCE(v_new_role_name, 'none'),
      jsonb_build_object('role', v_old_role_name),
      jsonb_build_object('role', v_new_role_name)
    );
  END IF;
  
  -- Account status changes
  IF TG_OP = 'UPDATE' AND OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    PERFORM write_audit_log(
      auth.uid(),
      'admin', 'account_status_change',
      CASE WHEN NEW.account_status = 'suspended' THEN 'critical' ELSE 'info' END,
      'user', NEW.user_id::text, NEW.full_name,
      'Account status changed for ' || COALESCE(NEW.full_name, NEW.email) || ' from ' || COALESCE(OLD.account_status, 'unknown') || ' to ' || NEW.account_status,
      jsonb_build_object('account_status', OLD.account_status),
      jsonb_build_object('account_status', NEW.account_status)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_profile_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profile_role_change();

-- ============================================================
-- TRIGGER: VCR prerequisite status changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_vcr_prerequisite_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM write_audit_log(
      auth.uid(),
      'vcr', 'prerequisite_status_change', 'info',
      'vcr_prerequisite', NEW.id::text, NULL,
      'VCR prerequisite status changed from ' || COALESCE(OLD.status, 'none') || ' to ' || NEW.status,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_vcr_prerequisite
  AFTER UPDATE ON public.p2a_vcr_prerequisites
  FOR EACH ROW EXECUTE FUNCTION public.audit_vcr_prerequisite_change();

-- ============================================================
-- TRIGGER: Permission matrix changes (critical security event)
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_permission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_role_name FROM public.roles WHERE id = NEW.role_id;
    PERFORM write_audit_log(
      auth.uid(),
      'admin', 'permission_granted', 'critical',
      'role_permission', NEW.id::text, v_role_name,
      'Permission ' || NEW.permission::text || ' granted to role ' || COALESCE(v_role_name, NEW.role_id::text),
      NULL,
      jsonb_build_object('permission', NEW.permission::text, 'role', v_role_name)
    );
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO v_role_name FROM public.roles WHERE id = OLD.role_id;
    PERFORM write_audit_log(
      auth.uid(),
      'admin', 'permission_revoked', 'critical',
      'role_permission', OLD.id::text, v_role_name,
      'Permission ' || OLD.permission::text || ' revoked from role ' || COALESCE(v_role_name, OLD.role_id::text),
      jsonb_build_object('permission', OLD.permission::text, 'role', v_role_name),
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_permission_changes
  AFTER INSERT OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_permission_change();
