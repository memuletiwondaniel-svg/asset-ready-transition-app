CREATE OR REPLACE FUNCTION public.vcr_item_decide(p_prereq_id uuid, p_decision text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_ledger_id uuid;
  v_role_id   uuid;
  v_vcr_item_id uuid;
  v_handover_point_id uuid;
  v_action_tag text;
  v_body text;
  v_prereq_status text;
  v_ledger jsonb;
  v_decision public.vcr_prereq_approval_status;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_decision NOT IN ('ACCEPTED','REJECTED','QUALIFIED') THEN
    RAISE EXCEPTION 'invalid decision %', p_decision USING ERRCODE = '22023';
  END IF;

  v_decision := p_decision::public.vcr_prereq_approval_status;

  IF p_decision = 'REJECTED' AND (p_note IS NULL OR btrim(p_note) = '') THEN
    RAISE EXCEPTION 'A reason is required when returning an item' USING ERRCODE = '22023';
  END IF;

  SELECT a.id, a.approver_role_id, p.vcr_item_id, p.handover_point_id
    INTO v_ledger_id, v_role_id, v_vcr_item_id, v_handover_point_id
  FROM public.vcr_prerequisite_approvals a
  JOIN public.p2a_vcr_prerequisites p ON p.id = a.prerequisite_id
  WHERE a.prerequisite_id = p_prereq_id
    AND a.approver_user_id = v_uid
  LIMIT 1;

  IF v_ledger_id IS NULL THEN
    RAISE EXCEPTION 'You are not a seeded approver on this item' USING ERRCODE = '42501';
  END IF;

  UPDATE public.vcr_prerequisite_approvals
     SET status = v_decision,
         comment = NULLIF(btrim(coalesce(p_note,'')), ''),
         decided_at = now(),
         updated_at = now()
   WHERE id = v_ledger_id;

  v_action_tag := CASE p_decision
    WHEN 'ACCEPTED'  THEN 'Accepted'
    WHEN 'REJECTED'  THEN 'Returned'
    WHEN 'QUALIFIED' THEN 'Qualification raised'
  END;
  v_body := NULLIF(btrim(coalesce(p_note, '')), '');
  IF v_body IS NULL THEN
    v_body := '(' || lower(v_action_tag) || ')';
  END IF;

  IF v_vcr_item_id IS NOT NULL AND v_handover_point_id IS NOT NULL THEN
    INSERT INTO public.vcr_item_comments
      (handover_point_id, vcr_item_id, author_user_id, body, action_tag)
    VALUES
      (v_handover_point_id, v_vcr_item_id, v_uid, v_body, v_action_tag);
  END IF;

  SELECT status::text INTO v_prereq_status
    FROM public.p2a_vcr_prerequisites WHERE id = p_prereq_id;

  SELECT jsonb_agg(jsonb_build_object(
    'id', id, 'approver_user_id', approver_user_id,
    'approver_role_id', approver_role_id, 'status', status,
    'decided_at', decided_at, 'comment', comment
  ))
  INTO v_ledger
  FROM public.vcr_prerequisite_approvals
  WHERE prerequisite_id = p_prereq_id;

  RETURN jsonb_build_object(
    'prerequisite_id', p_prereq_id,
    'prereq_status',   v_prereq_status,
    'ledger',          COALESCE(v_ledger, '[]'::jsonb)
  );
END
$function$;