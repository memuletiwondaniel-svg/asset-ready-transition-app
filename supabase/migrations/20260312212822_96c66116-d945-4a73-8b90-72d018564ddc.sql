-- Fix trigger referencing non-existent approver_name column
CREATE OR REPLACE FUNCTION public.audit_p2a_approver_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('APPROVED', 'REJECTED') THEN
    PERFORM write_audit_log(
      COALESCE(NEW.user_id, auth.uid()),
      'p2a', LOWER(NEW.status),
      CASE WHEN NEW.status = 'REJECTED' THEN 'warning' ELSE 'info' END,
      'p2a_approver', NEW.id::text, NEW.role_name,
      'P2A approver ' || NEW.role_name || ' ' || LOWER(NEW.status),
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'comments', NEW.comments)
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Now fix the existing data: mark ORA Lead as REJECTED with Roaa's comment
UPDATE public.p2a_handover_approvers 
SET status = 'REJECTED', 
    comments = 'Missing VCR elements for phase 2 power from MOE', 
    approved_at = NOW() 
WHERE handover_id = '4bb9517f-2779-4414-b866-921230d56218' 
  AND role_name = 'ORA Lead';