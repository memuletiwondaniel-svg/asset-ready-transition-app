
-- Fix: Replace the log_orp_activity function to skip logging when deleting orp_plans
-- The issue is that cascade deletes child rows first, then the AFTER DELETE trigger
-- tries to INSERT into orp_activity_log referencing the deleted plan, causing FK violation.
CREATE OR REPLACE FUNCTION public.log_orp_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  plan_uuid UUID;
  activity_desc TEXT;
  activity_entity TEXT;
BEGIN
  -- Skip logging for DELETE on orp_plans itself (cascade already deleted activity_log rows)
  IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'orp_plans' THEN
    RETURN OLD;
  END IF;

  -- Determine plan_id based on table
  IF TG_TABLE_NAME = 'orp_plans' THEN
    plan_uuid := COALESCE(NEW.id, OLD.id);
    activity_entity := 'plan';
  ELSIF TG_TABLE_NAME = 'orp_plan_deliverables' THEN
    plan_uuid := COALESCE(NEW.orp_plan_id, OLD.orp_plan_id);
    activity_entity := 'deliverable';
  ELSIF TG_TABLE_NAME = 'orp_approvals' THEN
    plan_uuid := COALESCE(NEW.orp_plan_id, OLD.orp_plan_id);
    activity_entity := 'approval';
  ELSIF TG_TABLE_NAME = 'orp_resources' THEN
    plan_uuid := COALESCE(NEW.orp_plan_id, OLD.orp_plan_id);
    activity_entity := 'resource';
  ELSIF TG_TABLE_NAME = 'orp_deliverable_attachments' THEN
    SELECT pd.orp_plan_id INTO plan_uuid
    FROM public.orp_plan_deliverables pd
    WHERE pd.id = COALESCE(NEW.plan_deliverable_id, OLD.plan_deliverable_id);
    activity_entity := 'attachment';
  ELSIF TG_TABLE_NAME = 'orp_collaborators' THEN
    SELECT pd.orp_plan_id INTO plan_uuid
    FROM public.orp_plan_deliverables pd
    WHERE pd.id = COALESCE(NEW.plan_deliverable_id, OLD.plan_deliverable_id);
    activity_entity := 'collaborator';
  END IF;

  -- If plan_uuid is NULL (e.g. cascade already deleted parent), skip logging
  IF plan_uuid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Build description based on operation
  IF TG_OP = 'INSERT' THEN
    activity_desc := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    activity_desc := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    activity_desc := 'deleted';
  END IF;

  -- Insert activity log (skip if plan no longer exists)
  INSERT INTO public.orp_activity_log (
    orp_plan_id,
    user_id,
    activity_type,
    entity_type,
    entity_id,
    description,
    metadata
  ) 
  SELECT
    plan_uuid,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    TG_OP,
    activity_entity,
    COALESCE(NEW.id, OLD.id),
    activity_desc,
    CASE 
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      ELSE to_jsonb(OLD)
    END
  WHERE EXISTS (SELECT 1 FROM public.orp_plans WHERE id = plan_uuid);

  RETURN COALESCE(NEW, OLD);
END;
$function$;
