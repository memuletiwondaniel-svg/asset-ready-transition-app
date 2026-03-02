-- Schedule weekly audit log purge (every Sunday at 2 AM UTC)
SELECT cron.schedule(
  'weekly-audit-log-purge',
  '0 2 * * 0',
  $$SELECT public.purge_old_audit_logs(
    (SELECT (value->>'retention_days')::integer 
     FROM public.system_settings 
     WHERE key = 'audit_log_retention')
  )$$
);