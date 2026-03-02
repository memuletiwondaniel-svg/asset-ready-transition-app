-- =====================================================
-- 1. Permission Review Campaigns table
-- =====================================================
CREATE TABLE public.permission_review_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  created_by UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_review_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permission reviews"
  ON public.permission_review_campaigns FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()))
  WITH CHECK (public.user_is_admin(auth.uid()));

-- =====================================================
-- 2. Permission Review Items (per-user review)
-- =====================================================
CREATE TABLE public.permission_review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.permission_review_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  current_role_id UUID REFERENCES public.roles(id),
  current_permissions TEXT[],
  decision TEXT DEFAULT 'pending',
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_review_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage review items"
  ON public.permission_review_items FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()))
  WITH CHECK (public.user_is_admin(auth.uid()));

-- =====================================================
-- 3. Stale account tracking columns on profiles
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stale_flagged_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS offboarded_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS offboarded_by UUID REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS offboard_notes TEXT;

-- =====================================================
-- 4. Offboard user function (server-side, security definer)
-- =====================================================
CREATE OR REPLACE FUNCTION public.offboard_user(
  target_user_id UUID,
  admin_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reassigned_tasks INTEGER := 0;
  v_deactivated_keys INTEGER := 0;
  v_user_name TEXT;
BEGIN
  IF NOT public.user_is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Only administrators can offboard users';
  END IF;

  SELECT full_name INTO v_user_name FROM public.profiles WHERE user_id = target_user_id;

  UPDATE public.profiles
  SET status = 'inactive',
      account_status = 'suspended',
      is_active = false,
      offboarded_at = now(),
      offboarded_by = admin_user_id,
      offboard_notes = p_notes,
      updated_at = now()
  WHERE user_id = target_user_id;

  UPDATE public.user_tasks
  SET status = 'cancelled', updated_at = now()
  WHERE user_id = target_user_id AND status IN ('pending', 'in_progress', 'waiting');
  GET DIAGNOSTICS v_reassigned_tasks = ROW_COUNT;

  UPDATE public.api_keys
  SET is_active = false, updated_at = now()
  WHERE created_by = target_user_id AND is_active = true;
  GET DIAGNOSTICS v_deactivated_keys = ROW_COUNT;

  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  PERFORM write_audit_log(
    admin_user_id,
    'admin', 'user_offboarded', 'critical',
    'user', target_user_id::text, v_user_name,
    'User ' || COALESCE(v_user_name, 'unknown') || ' was offboarded',
    NULL,
    jsonb_build_object(
      'cancelled_tasks', v_reassigned_tasks,
      'deactivated_keys', v_deactivated_keys,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'cancelled_tasks', v_reassigned_tasks,
    'deactivated_keys', v_deactivated_keys,
    'user_name', v_user_name
  );
END;
$$;

-- =====================================================
-- 5. Flag stale accounts function
-- =====================================================
CREATE OR REPLACE FUNCTION public.flag_stale_accounts(days_threshold INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  flagged_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET stale_flagged_at = now()
  WHERE is_active = true
    AND status = 'active'
    AND stale_flagged_at IS NULL
    AND (
      last_login_at IS NULL
      OR last_login_at < now() - (days_threshold || ' days')::interval
    );
  GET DIAGNOSTICS flagged_count = ROW_COUNT;
  RETURN flagged_count;
END;
$$;

-- =====================================================
-- 6. High-privilege grant alert trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.alert_high_privilege_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role_name TEXT;
  v_perm TEXT;
BEGIN
  v_perm := NEW.permission::text;
  IF v_perm IN ('access_admin', 'manage_users', 'approve_pssr', 'approve_sof') THEN
    SELECT name INTO v_role_name FROM public.roles WHERE id = NEW.role_id;
    
    PERFORM write_audit_log(
      COALESCE(NEW.granted_by, auth.uid()),
      'security', 'high_privilege_granted', 'critical',
      'role_permission', NEW.id::text, COALESCE(v_role_name, 'unknown'),
      'High-privilege permission "' || v_perm || '" granted to role "' || COALESCE(v_role_name, 'unknown') || '"',
      NULL,
      jsonb_build_object('permission', v_perm, 'role_id', NEW.role_id, 'role_name', v_role_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alert_high_privilege_grant
  AFTER INSERT ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.alert_high_privilege_grant();

-- =====================================================
-- 7. Updated_at trigger for permission_review_campaigns
-- =====================================================
CREATE TRIGGER update_permission_review_campaigns_updated_at
  BEFORE UPDATE ON public.permission_review_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();