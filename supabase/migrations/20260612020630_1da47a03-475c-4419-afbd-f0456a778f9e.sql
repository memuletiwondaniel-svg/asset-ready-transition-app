CREATE OR REPLACE FUNCTION public.audit_vcr_prerequisite_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM write_audit_log(
      auth.uid(),
      'vcr', 'prerequisite_status_change', 'info',
      'vcr_prerequisite', NEW.id::text, NULL,
      'VCR prerequisite status changed from '
        || COALESCE(OLD.status::text, 'none')
        || ' to '
        || COALESCE(NEW.status::text, 'none'),
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$function$;