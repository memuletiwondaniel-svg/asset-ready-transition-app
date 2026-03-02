-- =====================================================
-- 1. Deployment Log table
-- =====================================================
CREATE TABLE public.deployment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_label TEXT,
  release_notes TEXT,
  environment TEXT NOT NULL DEFAULT 'production',
  deployed_by UUID REFERENCES auth.users(id),
  deployed_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  changes_summary JSONB DEFAULT '[]'::jsonb,
  rollback_version_id UUID,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deployment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage deployment log"
  ON public.deployment_log FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()))
  WITH CHECK (public.user_is_admin(auth.uid()));

CREATE INDEX idx_deployment_log_created ON public.deployment_log(created_at DESC);

-- =====================================================
-- 2. Tenant Feature Flags table
-- =====================================================
CREATE TABLE public.tenant_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_label TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_at TIMESTAMPTZ,
  enabled_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, feature_key)
);

ALTER TABLE public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feature flags"
  ON public.tenant_feature_flags FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()))
  WITH CHECK (public.user_is_admin(auth.uid()));

-- Authenticated users can read flags for their own tenant
CREATE POLICY "Users can read own tenant flags"
  ON public.tenant_feature_flags FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER update_tenant_feature_flags_updated_at
  BEFORE UPDATE ON public.tenant_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. Pre-publish checklist templates
-- =====================================================
CREATE TABLE public.publish_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.publish_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage publish checklist"
  ON public.publish_checklist_items FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()))
  WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Authenticated can read publish checklist"
  ON public.publish_checklist_items FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 4. Seed default publish checklist items
-- =====================================================
INSERT INTO public.publish_checklist_items (label, description, category, display_order, is_required) VALUES
  ('Preview tested', 'Verified all changes work correctly on the preview URL', 'testing', 1, true),
  ('Permissions verified', 'Checked that RBAC permissions are correct for affected features', 'security', 2, true),
  ('No console errors', 'Confirmed no JavaScript errors in browser console', 'testing', 3, false),
  ('Mobile responsive', 'Tested on mobile viewport if UI changes were made', 'testing', 4, false),
  ('Database migration reviewed', 'Reviewed any pending database changes for correctness', 'database', 5, true),
  ('Feature flags configured', 'Set up tenant feature flags if this is a tenant-specific release', 'deployment', 6, false),
  ('Release notes written', 'Added clear release notes describing what changed', 'documentation', 7, true),
  ('Stakeholder sign-off', 'Got approval from relevant stakeholders for significant changes', 'approval', 8, false);

-- =====================================================
-- 5. Function to check feature flag for current user's tenant
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM public.tenant_feature_flags
     WHERE tenant_id = public.get_user_tenant_id()
       AND feature_key = p_feature_key),
    false
  );
$$;

-- =====================================================
-- 6. Audit trigger for feature flag changes
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_feature_flag_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_enabled IS DISTINCT FROM NEW.is_enabled THEN
    SELECT name INTO v_tenant_name FROM public.tenants WHERE id = NEW.tenant_id;
    
    PERFORM write_audit_log(
      COALESCE(auth.uid(), NEW.enabled_by),
      'deployment', 'feature_flag_changed',
      CASE WHEN NEW.is_enabled THEN 'info' ELSE 'warning' END,
      'feature_flag', NEW.id::text, NEW.feature_label,
      'Feature "' || NEW.feature_label || '" ' || 
        CASE WHEN NEW.is_enabled THEN 'enabled' ELSE 'disabled' END ||
        ' for tenant ' || COALESCE(v_tenant_name, 'unknown'),
      jsonb_build_object('is_enabled', OLD.is_enabled),
      jsonb_build_object('is_enabled', NEW.is_enabled, 'tenant', v_tenant_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_feature_flag_change
  AFTER UPDATE ON public.tenant_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_feature_flag_change();