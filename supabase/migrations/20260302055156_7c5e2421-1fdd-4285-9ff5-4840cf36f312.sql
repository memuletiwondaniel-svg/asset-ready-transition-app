-- ============================================
-- API Key Management System
-- ============================================

-- Table to store scoped API keys for external integrations
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  allowed_ips TEXT[] DEFAULT NULL,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  last_rotated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  rotation_reminder_days INTEGER DEFAULT 90,
  total_requests BIGINT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage API keys"
ON public.api_keys FOR ALL
USING (public.user_is_admin(auth.uid()))
WITH CHECK (public.user_is_admin(auth.uid()));

-- Index for fast key lookup
CREATE INDEX idx_api_keys_prefix ON public.api_keys(key_prefix) WHERE is_active = true;
CREATE INDEX idx_api_keys_tenant ON public.api_keys(tenant_id);

-- ============================================
-- API Request Log (for rate limiting + monitoring)
-- ============================================

CREATE TABLE public.api_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  request_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view API request logs"
ON public.api_request_logs FOR SELECT
USING (public.user_is_admin(auth.uid()));

-- Partition-friendly index for time-based queries
CREATE INDEX idx_api_request_logs_created ON public.api_request_logs(created_at DESC);
CREATE INDEX idx_api_request_logs_key ON public.api_request_logs(api_key_id, created_at DESC);

-- ============================================
-- Webhook Configurations
-- ============================================

CREATE TABLE public.webhook_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  source_system TEXT NOT NULL,
  endpoint_path TEXT NOT NULL,
  signing_secret_hash TEXT NOT NULL,
  signing_algorithm TEXT NOT NULL DEFAULT 'sha256',
  header_name TEXT NOT NULL DEFAULT 'X-Webhook-Signature',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_received_at TIMESTAMP WITH TIME ZONE,
  total_received BIGINT DEFAULT 0,
  total_verified BIGINT DEFAULT 0,
  total_failed BIGINT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhook configs"
ON public.webhook_configs FOR ALL
USING (public.user_is_admin(auth.uid()))
WITH CHECK (public.user_is_admin(auth.uid()));

-- ============================================
-- Rate limiting function
-- ============================================

CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  p_key_prefix TEXT
)
RETURNS TABLE(
  is_allowed BOOLEAN,
  api_key_id UUID,
  remaining_requests INTEGER,
  key_permissions TEXT[],
  key_integration TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key RECORD;
  v_request_count INTEGER;
BEGIN
  -- Find the API key
  SELECT ak.id, ak.rate_limit_per_minute, ak.permissions, ak.integration_type, 
         ak.expires_at, ak.is_active, ak.allowed_ips
  INTO v_key
  FROM public.api_keys ak
  WHERE ak.key_prefix = p_key_prefix
    AND ak.is_active = true
  LIMIT 1;

  -- Key not found
  IF v_key.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, ARRAY[]::TEXT[], ''::TEXT;
    RETURN;
  END IF;

  -- Check expiry
  IF v_key.expires_at IS NOT NULL AND v_key.expires_at < now() THEN
    RETURN QUERY SELECT false, v_key.id, 0, ARRAY[]::TEXT[], ''::TEXT;
    RETURN;
  END IF;

  -- Count requests in last minute
  SELECT COUNT(*)::INTEGER INTO v_request_count
  FROM public.api_request_logs
  WHERE api_key_id = v_key.id
    AND created_at > now() - interval '1 minute';

  -- Update last used
  UPDATE public.api_keys 
  SET last_used_at = now(), total_requests = total_requests + 1
  WHERE id = v_key.id;

  RETURN QUERY SELECT 
    (v_request_count < v_key.rate_limit_per_minute),
    v_key.id,
    GREATEST(v_key.rate_limit_per_minute - v_request_count - 1, 0)::INTEGER,
    v_key.permissions,
    v_key.integration_type;
END;
$$;

-- ============================================
-- Auto-cleanup old request logs (keep 30 days)
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_api_request_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.api_request_logs
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Schedule weekly cleanup of old API request logs
SELECT cron.schedule(
  'weekly-api-log-cleanup',
  '0 3 * * 0',
  $$SELECT public.cleanup_old_api_request_logs()$$
);

-- Trigger for updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_configs_updated_at
  BEFORE UPDATE ON public.webhook_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();