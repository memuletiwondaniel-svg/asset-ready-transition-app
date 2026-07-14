
-- =========================================================================
-- 1) Atomic approver-decision RPC: writes ledger + comment in ONE transaction.
--    Prereq.status is owned by recompute_vcr_prerequisite_from_approvals.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.vcr_item_decide(
  p_prereq_id uuid,
  p_decision  text,     -- 'ACCEPTED' | 'REJECTED' | 'QUALIFIED'
  p_note      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_decision NOT IN ('ACCEPTED','REJECTED','QUALIFIED') THEN
    RAISE EXCEPTION 'invalid decision %', p_decision USING ERRCODE = '22023';
  END IF;

  IF p_decision = 'REJECTED' AND (p_note IS NULL OR btrim(p_note) = '') THEN
    RAISE EXCEPTION 'A reason is required when returning an item' USING ERRCODE = '22023';
  END IF;

  -- Resolve caller's ledger row (also proves seeded-approver membership).
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

  -- Ledger write (fires supersede_partner_ledger_rows + recompute triggers).
  UPDATE public.vcr_prerequisite_approvals
     SET status = p_decision,
         comment = NULLIF(btrim(coalesce(p_note,'')), ''),
         decided_at = now(),
         updated_at = now()
   WHERE id = v_ledger_id;

  -- Comment insert (skipped only when no note AND accept-with-no-note).
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

  -- Return resulting state.
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
$$;

REVOKE ALL ON FUNCTION public.vcr_item_decide(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vcr_item_decide(uuid, text, text) TO authenticated;

-- =========================================================================
-- 2) Backfill OI-19 (prereq 87c569ba-...): prereq is ACCEPTED but ledger rows
--    are still PENDING (legacy path bypassed the ledger). Repair advance-only:
--    - Ewan (9358a12a) → ACCEPTED at prereq.reviewed_at
--    - Lyle  (4f911475) → SUPERSEDED (partner)
--    The recompute trigger will no-op (prereq already ACCEPTED — advance-only
--    guard). The supersede trigger is bypassed here — we set Lyle explicitly.
-- =========================================================================
DO $backfill$
DECLARE
  v_prereq_id uuid := '87c569ba-5434-467b-a203-02bcad87da21';
  v_ewan uuid := '9358a12a-0c7c-44c7-a536-bb523c2e2829';
  v_lyle uuid := '4f911475-2022-4a0c-bfea-1a4263677c03';
  v_reviewed_at timestamptz;
  r RECORD;
BEGIN
  SELECT reviewed_at INTO v_reviewed_at
    FROM public.p2a_vcr_prerequisites WHERE id = v_prereq_id;

  UPDATE public.vcr_prerequisite_approvals
     SET status = 'ACCEPTED',
         decided_at = COALESCE(v_reviewed_at, now()),
         updated_at = now()
   WHERE prerequisite_id = v_prereq_id
     AND approver_user_id = v_ewan
     AND status = 'PENDING';

  UPDATE public.vcr_prerequisite_approvals
     SET status = 'SUPERSEDED',
         decided_at = COALESCE(v_reviewed_at, now()),
         updated_at = now()
   WHERE prerequisite_id = v_prereq_id
     AND approver_user_id = v_lyle
     AND status = 'PENDING';

  -- Recompute the two paired approval bundles so their counters reflect reality.
  FOR r IN
    SELECT ut.id
      FROM public.user_tasks ut
     WHERE ut.type = 'vcr_approval_bundle'
       AND ut.user_id IN (v_ewan, v_lyle)
       AND ut.metadata->>'vcr_id' = '96b44257-5c3b-4ec8-be04-1ada2d792257'
  LOOP
    PERFORM public._recompute_vcr_approval_bundle_row(r.id);
  END LOOP;
END
$backfill$;
