
-- Add SSO enforcement setting to tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS sso_enforcement text NOT NULL DEFAULT 'disabled';

-- SSO configuration per tenant
CREATE TABLE public.tenant_sso_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_type text NOT NULL DEFAULT 'saml',
  -- SAML configuration
  idp_entity_id text,
  idp_sso_url text,
  idp_metadata_url text,
  idp_certificate text,
  -- Supabase SSO provider ID (returned after registering with Supabase)
  supabase_sso_provider_id uuid,
  -- Display
  display_name text NOT NULL DEFAULT 'Company SSO',
  button_label text DEFAULT 'Sign in with SSO',
  -- Status
  is_active boolean NOT NULL DEFAULT false,
  is_configured boolean NOT NULL DEFAULT false,
  -- Audit
  configured_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One active config per tenant
  UNIQUE(tenant_id, provider_type)
);

-- Enable RLS
ALTER TABLE public.tenant_sso_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage SSO configs
CREATE POLICY "Admins can manage SSO configs"
ON public.tenant_sso_configs
FOR ALL
TO authenticated
USING (public.user_is_admin(auth.uid()))
WITH CHECK (public.user_is_admin(auth.uid()));

-- Anon can read active SSO configs (for login page SSO button)
CREATE POLICY "Anon can read active SSO configs"
ON public.tenant_sso_configs
FOR SELECT
TO anon
USING (is_active = true AND is_configured = true);

-- Authenticated can read active SSO configs
CREATE POLICY "Authenticated can read active SSO configs"
ON public.tenant_sso_configs
FOR SELECT
TO authenticated
USING (is_active = true AND is_configured = true);

-- Auto-update timestamp
CREATE TRIGGER update_tenant_sso_configs_updated_at
  BEFORE UPDATE ON public.tenant_sso_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
