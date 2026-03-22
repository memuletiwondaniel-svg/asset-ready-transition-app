-- Fix 11 functions flagged by Supabase linter for mutable search_path

CREATE OR REPLACE FUNCTION public.calculate_milestone_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF array_length(NEW.linked_deliverables, 1) > 0 THEN
    SELECT COALESCE(AVG(completion_percentage), 0)::INTEGER
    INTO NEW.progress_percentage
    FROM public.orp_plan_deliverables
    WHERE id = ANY(NEW.linked_deliverables);
    IF NEW.progress_percentage = 100 THEN
      NEW.status := 'COMPLETED';
      NEW.completion_date := CURRENT_DATE;
    ELSIF NEW.progress_percentage > 0 THEN
      NEW.status := 'IN_PROGRESS';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_orm_milestone_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF array_length(NEW.linked_deliverables, 1) > 0 THEN
    SELECT COALESCE(AVG(progress_percentage), 0)::INTEGER
    INTO NEW.progress_percentage
    FROM public.orm_deliverables
    WHERE id = ANY(NEW.linked_deliverables);
    IF NEW.progress_percentage = 100 THEN
      NEW.status := 'COMPLETED';
      NEW.completion_date := CURRENT_DATE;
    ELSIF NEW.progress_percentage > 0 THEN
      NEW.status := 'IN_PROGRESS';
    END IF;
    IF NEW.target_date IS NOT NULL AND NEW.target_date < CURRENT_DATE AND NEW.status != 'COMPLETED' THEN
      NEW.status := 'DELAYED';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_category_ref_id(category_name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = public
AS $function$
BEGIN
  CASE LOWER(category_name)
    WHEN 'general' THEN RETURN 'GN';
    WHEN 'process safety' THEN RETURN 'PS';
    WHEN 'organization' THEN RETURN 'OR';
    WHEN 'health & safety' THEN RETURN 'HS';
    WHEN 'emergency response' THEN RETURN 'ER';
    WHEN 'paco' THEN RETURN 'IN';
    WHEN 'static' THEN RETURN 'MS';
    WHEN 'rotating' THEN RETURN 'MR';
    WHEN 'civil' THEN RETURN 'CX';
    WHEN 'elect' THEN RETURN 'EL';
    WHEN 'documentation' THEN RETURN 'DC';
    ELSE RETURN 'XX';
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_p2a_audit_trail()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  handover_uuid UUID;
  action_description TEXT;
BEGIN
  IF TG_TABLE_NAME = 'p2a_handovers' THEN
    handover_uuid := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'p2a_handover_deliverables' THEN
    handover_uuid := COALESCE(NEW.handover_id, OLD.handover_id);
  ELSIF TG_TABLE_NAME = 'p2a_approval_workflow' THEN
    handover_uuid := COALESCE(NEW.handover_id, OLD.handover_id);
  ELSIF TG_TABLE_NAME = 'p2a_deliverable_attachments' THEN
    SELECT handover_id INTO handover_uuid
    FROM public.p2a_handover_deliverables
    WHERE id = COALESCE(NEW.deliverable_id, OLD.deliverable_id);
  END IF;

  IF TG_OP = 'INSERT' THEN
    action_description := 'Created ' || TG_TABLE_NAME;
  ELSIF TG_OP = 'UPDATE' THEN
    action_description := 'Updated ' || TG_TABLE_NAME;
  ELSIF TG_OP = 'DELETE' THEN
    action_description := 'Deleted ' || TG_TABLE_NAME;
  END IF;

  INSERT INTO public.p2a_audit_trail (
    handover_id, user_id, action_type, entity_type, entity_id,
    old_values, new_values, description
  ) VALUES (
    handover_uuid, auth.uid(), TG_OP || '_' || UPPER(TG_TABLE_NAME),
    TG_TABLE_NAME, COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    action_description
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reorder_checklist_item(item_unique_id text, new_position integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  item_category text;
  current_position integer;
BEGIN
  SELECT category, sequence_number INTO item_category, current_position
  FROM public.checklist_items
  WHERE unique_id = item_unique_id AND is_active = true;

  IF item_category IS NULL THEN
    RAISE EXCEPTION 'Checklist item not found';
  END IF;

  UPDATE public.checklist_items
  SET sequence_number = new_position
  WHERE unique_id = item_unique_id;

  PERFORM update_checklist_sequence_numbers(item_category);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_ai_user_context_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_annotation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_chat_conversation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_readiness_node_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;