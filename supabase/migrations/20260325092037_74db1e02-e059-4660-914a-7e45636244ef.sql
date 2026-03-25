ALTER TABLE public.dms_sync_logs
ADD COLUMN IF NOT EXISTS error_details JSONB;