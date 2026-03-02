-- Audit log retention configuration
INSERT INTO public.system_settings (key, value, label, description)
VALUES (
  'audit_log_retention',
  '{"enabled": true, "retention_days": 365, "auto_archive": true, "archive_to_storage": false}'::jsonb,
  'Audit Log Retention',
  'Audit log retention policy configuration'
)
ON CONFLICT (key) DO NOTHING;

-- Function to purge old audit logs
CREATE OR REPLACE FUNCTION public.purge_old_audit_logs(retention_days_param integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.audit_logs
  WHERE timestamp < now() - (retention_days_param || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;