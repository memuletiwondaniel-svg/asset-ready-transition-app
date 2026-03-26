ALTER TABLE public.dms_sync_credentials
ADD COLUMN IF NOT EXISTS primary_method TEXT DEFAULT 'rpa';

ALTER TABLE public.dms_sync_credentials
ADD COLUMN IF NOT EXISTS fallback_chain JSONB DEFAULT '["agent", "api"]'::jsonb;