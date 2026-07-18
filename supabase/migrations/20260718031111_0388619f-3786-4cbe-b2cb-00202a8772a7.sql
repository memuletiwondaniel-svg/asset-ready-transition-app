
CREATE OR REPLACE FUNCTION public._register_upsert_task(
  p_user_id uuid, p_register_id uuid, p_status p2a_register_workflow_status,
  p_task_type text, p_title text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dedupe text := 'register:'||p_register_id::text||':'||p_status::text||':'||p_user_id::text;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_tasks (user_id, title, type, status, dedupe_key, source_plan_table, source_plan_id, metadata)
  VALUES (p_user_id, p_title, p_task_type, 'open', v_dedupe,
          'p2a_vcr_operational_registers', p_register_id,
          jsonb_build_object('register_id', p_register_id, 'status', p_status::text))
  ON CONFLICT (dedupe_key) WHERE (dedupe_key IS NOT NULL) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public._register_close_tasks(
  p_register_id uuid, p_user_id uuid DEFAULT NULL,
  p_types text[] DEFAULT ARRAY['register_action','register_review']
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_tasks SET status='closed', updated_at=now()
   WHERE source_plan_table='p2a_vcr_operational_registers'
     AND source_plan_id=p_register_id AND type=ANY(p_types) AND status='open'
     AND (p_user_id IS NULL OR user_id=p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.advance_register_status(
  p_register_id uuid, p_action text, p_comment text DEFAULT NULL, p_reviewer_ids uuid[] DEFAULT NULL
) RETURNS p2a_register_workflow_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reg public.p2a_vcr_operational_registers%ROWTYPE;
  v_uid uuid := auth.uid();
  v_new_status p2a_register_workflow_status;
  v_pending int; v_rejected int; v_total int; v_author uuid; v_rid uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT * INTO v_reg FROM public.p2a_vcr_operational_registers WHERE id=p_register_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'register % not found', p_register_id; END IF;
  v_author := COALESCE(v_reg.draft_owner_id, v_reg.created_by, v_uid);

  IF p_action='start_draft' THEN
    IF v_reg.workflow_status<>'NOT_STARTED' THEN RAISE EXCEPTION 'invalid transition'; END IF;
    v_new_status:='DRAFT';
    UPDATE public.p2a_vcr_operational_registers
       SET workflow_status=v_new_status, draft_owner_id=COALESCE(draft_owner_id,v_uid), updated_at=now()
     WHERE id=p_register_id;
    PERFORM public._register_close_tasks(p_register_id,v_author,ARRAY['register_action']);
    PERFORM public._register_upsert_task(v_uid,p_register_id,v_new_status,'register_action','Draft: '||v_reg.title);

  ELSIF p_action IN ('submit_for_review','resubmit') THEN
    IF v_reg.workflow_status NOT IN ('DRAFT','REWORK_REQUESTED') THEN RAISE EXCEPTION 'invalid transition'; END IF;
    IF p_reviewer_ids IS NULL OR array_length(p_reviewer_ids,1) IS NULL THEN RAISE EXCEPTION 'reviewers required'; END IF;
    v_new_status:='UNDER_REVIEW';
    UPDATE public.p2a_vcr_operational_registers
       SET workflow_status=v_new_status, submitted_for_review_at=now(), updated_at=now()
     WHERE id=p_register_id;
    DELETE FROM public.p2a_vcr_register_reviewers WHERE register_id=p_register_id;
    INSERT INTO public.p2a_vcr_register_reviewers (register_id, reviewer_id, decision, reviewer_order)
    SELECT p_register_id, uid, 'pending'::p2a_register_reviewer_decision, ord
      FROM unnest(p_reviewer_ids) WITH ORDINALITY AS t(uid,ord);
    PERFORM public._register_close_tasks(p_register_id,NULL,ARRAY['register_action','register_review']);
    FOR v_rid IN SELECT unnest(p_reviewer_ids) LOOP
      PERFORM public._register_upsert_task(v_rid,p_register_id,v_new_status,'register_review','Review: '||v_reg.title);
    END LOOP;
    INSERT INTO public.p2a_vcr_register_activity_log (register_id,actor_id,action,comment)
    VALUES (p_register_id,v_uid,'submitted_for_review',p_comment);

  ELSIF p_action='approve' THEN
    IF v_reg.workflow_status<>'UNDER_REVIEW' THEN RAISE EXCEPTION 'invalid transition'; END IF;
    IF p_comment IS NULL OR length(btrim(p_comment))=0 THEN RAISE EXCEPTION 'comment required'; END IF;
    UPDATE public.p2a_vcr_register_reviewers
       SET decision='approved', decision_at=now(), decision_comment=p_comment, updated_at=now()
     WHERE register_id=p_register_id AND reviewer_id=v_uid AND decision='pending';
    IF NOT FOUND THEN RAISE EXCEPTION 'no pending reviewer row'; END IF;
    PERFORM public._register_close_tasks(p_register_id,v_uid,ARRAY['register_review']);
    SELECT count(*) FILTER(WHERE decision='pending'), count(*) FILTER(WHERE decision='rejected'), count(*)
      INTO v_pending,v_rejected,v_total
      FROM public.p2a_vcr_register_reviewers WHERE register_id=p_register_id;
    IF v_pending=0 AND v_rejected=0 AND v_total>0 THEN
      v_new_status:='APPROVED';
      UPDATE public.p2a_vcr_operational_registers SET workflow_status=v_new_status, approved_at=now(), updated_at=now() WHERE id=p_register_id;
      PERFORM public._register_close_tasks(p_register_id,NULL,ARRAY['register_action','register_review']);
    ELSE v_new_status:='UNDER_REVIEW'; END IF;
    INSERT INTO public.p2a_vcr_register_activity_log (register_id,actor_id,action,comment)
    VALUES (p_register_id,v_uid,'approved',p_comment);

  ELSIF p_action='reject' THEN
    IF v_reg.workflow_status<>'UNDER_REVIEW' THEN RAISE EXCEPTION 'invalid transition'; END IF;
    IF p_comment IS NULL OR length(btrim(p_comment))=0 THEN RAISE EXCEPTION 'comment required'; END IF;
    UPDATE public.p2a_vcr_register_reviewers
       SET decision='rejected', decision_at=now(), decision_comment=p_comment, updated_at=now()
     WHERE register_id=p_register_id AND reviewer_id=v_uid AND decision='pending';
    IF NOT FOUND THEN RAISE EXCEPTION 'no pending reviewer row'; END IF;
    v_new_status:='REWORK_REQUESTED';
    UPDATE public.p2a_vcr_operational_registers
       SET workflow_status=v_new_status, latest_rejection_reason=p_comment,
           latest_rejection_reviewer=v_uid, updated_at=now()
     WHERE id=p_register_id;
    PERFORM public._register_close_tasks(p_register_id,NULL,ARRAY['register_review']);
    PERFORM public._register_upsert_task(v_author,p_register_id,v_new_status,'register_action','Rework: '||v_reg.title);
    INSERT INTO public.p2a_vcr_register_activity_log (register_id,actor_id,action,comment)
    VALUES (p_register_id,v_uid,'rejected',p_comment);

  ELSE RAISE EXCEPTION 'unknown action %', p_action;
  END IF;
  RETURN v_new_status;
END; $$;

GRANT EXECUTE ON FUNCTION public.advance_register_status(uuid,text,text,uuid[]) TO authenticated;

INSERT INTO public.user_tasks (user_id, title, type, status, dedupe_key, source_plan_table, source_plan_id, metadata)
SELECT COALESCE(r.draft_owner_id, r.created_by),
       CASE r.workflow_status
         WHEN 'NOT_STARTED' THEN 'Start draft: '||r.title
         WHEN 'DRAFT' THEN 'Draft: '||r.title
         WHEN 'REWORK_REQUESTED' THEN 'Rework: '||r.title
         ELSE 'Register: '||r.title END,
       'register_action','open',
       'register:'||r.id::text||':'||r.workflow_status::text||':'||COALESCE(r.draft_owner_id,r.created_by)::text,
       'p2a_vcr_operational_registers', r.id,
       jsonb_build_object('register_id',r.id,'status',r.workflow_status::text)
  FROM public.p2a_vcr_operational_registers r
 WHERE r.workflow_status IN ('NOT_STARTED','DRAFT','REWORK_REQUESTED')
   AND COALESCE(r.draft_owner_id, r.created_by) IS NOT NULL
ON CONFLICT (dedupe_key) WHERE (dedupe_key IS NOT NULL) DO NOTHING;

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='p2a_vcr_operational_registers' AND policyname ILIKE '%placeholder%'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.p2a_vcr_operational_registers', p.policyname); END LOOP;
END $$;

INSERT INTO public.qaqc_checks (id, category, title, severity, sql, is_active) VALUES
('R1_register_status_legacy','registers','R1: no legacy register status values','error',
 $q$SELECT id, workflow_status::text FROM public.p2a_vcr_operational_registers
     WHERE workflow_status NOT IN ('NOT_STARTED','DRAFT','UNDER_REVIEW','APPROVED','REWORK_REQUESTED')$q$, true),
('R2_register_owner_task','registers','R2: non-terminal registers must have exactly one open owner task','error',
 $q$WITH need AS (
     SELECT r.id, r.workflow_status,
            CASE WHEN r.workflow_status='UNDER_REVIEW' THEN 'register_review' ELSE 'register_action' END AS ttype
       FROM public.p2a_vcr_operational_registers r
      WHERE r.workflow_status IN ('NOT_STARTED','DRAFT','UNDER_REVIEW','REWORK_REQUESTED')
   ), agg AS (
     SELECT n.id, n.workflow_status, n.ttype, count(t.*) AS open_tasks
       FROM need n LEFT JOIN public.user_tasks t
         ON t.source_plan_table='p2a_vcr_operational_registers' AND t.source_plan_id=n.id
        AND t.type=n.ttype AND t.status='open'
      GROUP BY 1,2,3
   ) SELECT id, workflow_status::text, ttype, open_tasks FROM agg
     WHERE (ttype='register_action' AND open_tasks<>1) OR (ttype='register_review' AND open_tasks<1)$q$, true),
('R3_register_no_reviewers_on_not_started','registers','R3: NOT_STARTED registers must not have reviewer rows','warning',
 $q$SELECT r.id FROM public.p2a_vcr_operational_registers r
     JOIN public.p2a_vcr_register_reviewers rv ON rv.register_id=r.id
    WHERE r.workflow_status='NOT_STARTED'$q$, true),
('R4_register_approved_all_reviewers','registers','R4: APPROVED registers must have all reviewer rows approved','error',
 $q$SELECT r.id FROM public.p2a_vcr_operational_registers r
     JOIN public.p2a_vcr_register_reviewers rv ON rv.register_id=r.id
    WHERE r.workflow_status='APPROVED' AND rv.decision<>'approved'$q$, true),
('M1_maint_complete_batches_approved','maintenance','M1: COMPLETE batches must have approved_by set','error',
 $q$SELECT id FROM public.p2a_vcr_maint_batches WHERE status='COMPLETE' AND approved_by IS NULL$q$, true),
('M2_maint_spares_delivered_flag','maintenance','M2: spares delivered flag must be non-null','error',
 $q$SELECT id FROM public.p2a_vcr_maint_spares WHERE delivered IS NULL$q$, true)
ON CONFLICT (id) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title,
  severity=EXCLUDED.severity, sql=EXCLUDED.sql, is_active=EXCLUDED.is_active, updated_at=now();
