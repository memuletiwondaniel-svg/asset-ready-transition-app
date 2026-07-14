CREATE OR REPLACE FUNCTION public._recompute_vcr_checklist_bundle_row(p_task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub jsonb; v_meta jsonb;
  v_total int; v_submitted int; v_approved int;
  v_pct int; v_new_status text; v_new_sub jsonb;
BEGIN
  SELECT sub_items, metadata INTO v_sub, v_meta FROM public.user_tasks WHERE id = p_task_id;
  IF v_sub IS NULL THEN RETURN; END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE p.status IN ('READY_FOR_REVIEW','ACCEPTED','QUALIFICATION_REQUESTED','QUALIFICATION_APPROVED')),
    COUNT(*) FILTER (WHERE p.status IN ('ACCEPTED','QUALIFICATION_APPROVED'))
  INTO v_total, v_submitted, v_approved
  FROM jsonb_array_elements(COALESCE(v_sub,'[]'::jsonb)) AS item
  JOIN public.p2a_vcr_prerequisites p ON p.id = (item->>'prerequisite_id')::uuid;

  -- progress% = completed sub_items (submitted set) / total, matches sub_items.completed flag
  v_pct := CASE WHEN v_total > 0 THEN ROUND((COALESCE(v_submitted,0)::numeric / v_total) * 100) ELSE 0 END;

  IF v_total > 0 AND COALESCE(v_approved,0) >= v_total THEN
    v_new_status := 'completed';
  ELSIF COALESCE(v_submitted,0) > 0 THEN
    v_new_status := 'in_progress';
  ELSE
    v_new_status := 'pending';
  END IF;

  SELECT jsonb_agg(
    item || jsonb_build_object(
      'completed',
      COALESCE(p.status IN ('READY_FOR_REVIEW','ACCEPTED','QUALIFICATION_REQUESTED','QUALIFICATION_APPROVED'), false)
    )
  ) INTO v_new_sub
  FROM jsonb_array_elements(COALESCE(v_sub,'[]'::jsonb)) AS item
  LEFT JOIN public.p2a_vcr_prerequisites p ON p.id = (item->>'prerequisite_id')::uuid;

  UPDATE public.user_tasks
     SET progress_percentage = v_pct,
         status = v_new_status,
         sub_items = COALESCE(v_new_sub, v_sub),
         metadata = COALESCE(v_meta,'{}'::jsonb) || jsonb_build_object(
           'delivering_total_items',     v_total,
           'delivering_submitted_items', COALESCE(v_submitted,0),
           'delivering_approved_items',  COALESCE(v_approved,0)
         ),
         updated_at = now()
   WHERE id = p_task_id;
END
$function$;