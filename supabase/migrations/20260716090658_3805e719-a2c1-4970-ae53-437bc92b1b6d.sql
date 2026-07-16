
-- Widen user_tasks allowlists ------------------------------
ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_source_plan_table_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_source_plan_table_check
  CHECK (source_plan_table IS NULL OR source_plan_table = ANY (ARRAY[
    'orp_plans','p2a_handover_plans','p2a_handover_points','p2a_vcr_training'
  ]));

ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_type_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_type_check
  CHECK (type = ANY (ARRAY[
    'approval','task','update','review',
    'vcr_checklist_bundle','vcr_approval_bundle',
    'pssr_checklist_bundle','pssr_approval_bundle',
    'ora_plan_review','ora_activity','vcr_delivery_plan','ora_plan_creation',
    'vcr_plan_resubmit','vcr_interdisciplinary_summary','qualification_review',
    'wh_delivery_bundle','wh_review',
    'training_action','training_review'
  ]));

-- Fix Elect discipline mapping
INSERT INTO public.discipline_responsible_ta_role (discipline_id, role_name)
SELECT id, 'Elect TA2 – Project' FROM public.discipline WHERE name = 'Elect'
ON CONFLICT (discipline_id) DO UPDATE SET role_name = EXCLUDED.role_name;

-- Helpers ---------------------------------------------------
CREATE OR REPLACE FUNCTION public._training_owner_role(p_status public.training_status)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_status
    WHEN 'NOT_STARTED'              THEN 'Snr ORA Engr'
    WHEN 'AWAITING_PO'              THEN 'Project Engr'
    WHEN 'AWAITING_MATERIALS'       THEN 'Snr ORA Engr'
    WHEN 'MATERIALS_UNDER_REVIEW'   THEN NULL
    WHEN 'AWAITING_ATTENDANCE_LIST' THEN 'Dep. Plant Director'
    WHEN 'READY_TO_SCHEDULE'        THEN 'Snr ORA Engr'
    WHEN 'SCHEDULED'                THEN 'Snr ORA Engr'
    WHEN 'COMPLETED'                THEN NULL
  END
$$;

CREATE OR REPLACE FUNCTION public._training_task_title(
  p_status public.training_status, p_vcr_code text, p_title text
) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_status
    WHEN 'NOT_STARTED'              THEN p_vcr_code || ': Request PO — ' || p_title
    WHEN 'AWAITING_PO'              THEN p_vcr_code || ': Provide PO — ' || p_title
    WHEN 'AWAITING_MATERIALS'       THEN p_vcr_code || ': Upload training materials — ' || p_title
    WHEN 'AWAITING_ATTENDANCE_LIST' THEN p_vcr_code || ': Provide attendance list — ' || p_title
    WHEN 'READY_TO_SCHEDULE'        THEN p_vcr_code || ': Schedule training — ' || p_title
    WHEN 'SCHEDULED'                THEN p_vcr_code || ': Complete training — ' || p_title
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public._training_close_open_tasks(p_training_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_tasks SET status='cancelled_superseded', updated_at=now()
   WHERE source_plan_table='p2a_vcr_training' AND source_plan_id=p_training_id
     AND status IN ('pending','in_progress','waiting');
$$;

CREATE OR REPLACE FUNCTION public._training_create_owner_task(
  p_training_id uuid, p_status public.training_status,
  p_project_id uuid, p_project_code text, p_vcr_code text,
  p_hp_id uuid, p_title text, p_tenant_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner_role text := public._training_owner_role(p_status);
        v_user uuid; v_dedupe text;
BEGIN
  IF v_owner_role IS NULL THEN RETURN; END IF;
  v_user := public.resolve_project_role_user(p_project_id, v_owner_role);
  IF v_user IS NULL THEN RETURN; END IF;
  v_dedupe := 'training:'||p_training_id::text||':step:'||p_status::text||':user:'||v_user::text;

  UPDATE public.user_tasks SET status='pending',
    title=public._training_task_title(p_status,p_vcr_code,p_title), updated_at=now()
   WHERE dedupe_key = v_dedupe;
  IF FOUND THEN RETURN; END IF;

  INSERT INTO public.user_tasks (
    user_id, title, priority, type, status,
    source_plan_table, source_plan_id, dedupe_key, tenant_id, metadata
  ) VALUES (
    v_user, public._training_task_title(p_status,p_vcr_code,p_title),
    'Medium','training_action','pending',
    'p2a_vcr_training', p_training_id, v_dedupe, p_tenant_id,
    jsonb_build_object(
      'action','training_workflow','training_id',p_training_id,
      'training_status',p_status::text,'owner_role',v_owner_role,
      'project_id',p_project_id,'project_code',p_project_code,
      'vcr_code',p_vcr_code,'point_id',p_hp_id,'source','p2a_vcr_training'
    )
  );
END; $$;

CREATE OR REPLACE FUNCTION public._training_create_reviewer_tasks(
  p_training_id uuid, p_project_id uuid, p_project_code text,
  p_vcr_code text, p_hp_id uuid, p_title text, p_tenant_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_dedupe text; v_title text;
BEGIN
  FOR r IN
    SELECT user_id, role_label FROM public.p2a_vcr_training_reviewers
     WHERE training_id=p_training_id AND decision IS NULL
  LOOP
    v_dedupe := 'training:'||p_training_id::text||':step:MATERIALS_UNDER_REVIEW:user:'||r.user_id::text;
    v_title := p_vcr_code || ': Review training materials — ' || p_title;
    UPDATE public.user_tasks SET status='pending', title=v_title, updated_at=now() WHERE dedupe_key=v_dedupe;
    IF NOT FOUND THEN
      INSERT INTO public.user_tasks (
        user_id, title, priority, type, status,
        source_plan_table, source_plan_id, dedupe_key, tenant_id, metadata
      ) VALUES (
        r.user_id, v_title, 'Medium','training_review','pending',
        'p2a_vcr_training', p_training_id, v_dedupe, p_tenant_id,
        jsonb_build_object(
          'action','training_review','training_id',p_training_id,
          'training_status','MATERIALS_UNDER_REVIEW','reviewer_role',r.role_label,
          'project_id',p_project_id,'project_code',p_project_code,
          'vcr_code',p_vcr_code,'point_id',p_hp_id,'source','p2a_vcr_training'
        )
      );
    END IF;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public._training_context(p_training_id uuid)
RETURNS TABLE(
  training_id uuid, title text, status public.training_status,
  handover_point_id uuid, vcr_code text,
  project_id uuid, project_code text, tenant_id uuid
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.title, t.status, hp.id, hp.vcr_code, p.id, php.project_code, p.tenant_id
    FROM public.p2a_vcr_training t
    JOIN public.p2a_handover_points hp ON hp.id = t.handover_point_id
    JOIN public.p2a_handover_plans php ON php.id = hp.handover_plan_id
    JOIN public.projects p ON p.id = php.project_id
   WHERE t.id = p_training_id
$$;

CREATE OR REPLACE FUNCTION public.advance_training_status(
  p_training_id uuid, p_action text, p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_ctx record; v_from public.training_status; v_to public.training_status;
  v_owner_role text; v_owner uuid; v_note text;
  v_pending int; v_rejected int; v_reviewer_row record;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_ctx FROM public._training_context(p_training_id);
  IF v_ctx IS NULL THEN RAISE EXCEPTION 'training not found: %', p_training_id; END IF;
  v_from := v_ctx.status;
  v_note := NULLIF(trim(coalesce(p_payload->>'comment','')), '');

  IF p_action = 'request_po' THEN
    IF v_from <> 'NOT_STARTED' THEN RAISE EXCEPTION 'invalid transition from %', v_from; END IF;
    v_to := 'AWAITING_PO';
  ELSIF p_action = 'provide_po' THEN
    IF v_from <> 'AWAITING_PO' THEN RAISE EXCEPTION 'invalid transition from %', v_from; END IF;
    IF NULLIF(trim(coalesce(p_payload->>'po_number','')), '') IS NULL THEN RAISE EXCEPTION 'po_number is required'; END IF;
    UPDATE public.p2a_vcr_training SET po_number=p_payload->>'po_number', po_provided_at=now(), po_provided_by=v_caller WHERE id=p_training_id;
    v_to := 'AWAITING_MATERIALS';
  ELSIF p_action = 'upload_materials' THEN
    IF v_from <> 'AWAITING_MATERIALS' THEN RAISE EXCEPTION 'invalid transition from %', v_from; END IF;
    IF p_payload ? 'reviewers' AND jsonb_typeof(p_payload->'reviewers')='array' THEN
      DELETE FROM public.p2a_vcr_training_reviewers WHERE training_id=p_training_id;
      INSERT INTO public.p2a_vcr_training_reviewers(training_id, user_id, role_label, added_by)
      SELECT p_training_id, (r->>'user_id')::uuid, r->>'role_label', v_caller
        FROM jsonb_array_elements(p_payload->'reviewers') AS r WHERE (r->>'user_id') IS NOT NULL;
    ELSE
      UPDATE public.p2a_vcr_training_reviewers SET decision=NULL, decision_comment=NULL, decided_at=NULL, markup_attachment_id=NULL WHERE training_id=p_training_id;
    END IF;
    v_to := 'MATERIALS_UNDER_REVIEW';
  ELSIF p_action = 'submit_review' THEN
    IF v_from <> 'MATERIALS_UNDER_REVIEW' THEN RAISE EXCEPTION 'invalid transition from %', v_from; END IF;
    SELECT * INTO v_reviewer_row FROM public.p2a_vcr_training_reviewers WHERE training_id=p_training_id AND user_id=v_caller;
    IF v_reviewer_row IS NULL THEN RAISE EXCEPTION 'caller is not a reviewer'; END IF;
    IF v_reviewer_row.decision IS NOT NULL THEN RAISE EXCEPTION 'reviewer decision already recorded'; END IF;
    IF (p_payload->>'decision') NOT IN ('APPROVED','REJECTED') THEN RAISE EXCEPTION 'decision must be APPROVED or REJECTED'; END IF;
    IF v_note IS NULL THEN RAISE EXCEPTION 'comment is required'; END IF;

    UPDATE public.p2a_vcr_training_reviewers
       SET decision=p_payload->>'decision', decision_comment=v_note, decided_at=now(),
           markup_attachment_id=NULLIF(p_payload->>'markup_attachment_id','')::uuid
     WHERE id=v_reviewer_row.id;

    UPDATE public.user_tasks SET status='completed', updated_at=now()
     WHERE source_plan_table='p2a_vcr_training' AND source_plan_id=p_training_id
       AND user_id=v_caller AND type='training_review' AND status IN ('pending','in_progress');

    INSERT INTO public.p2a_vcr_training_activity_log(training_id,user_id,action,comment,from_status,to_status)
    VALUES (p_training_id, v_caller,
      CASE WHEN p_payload->>'decision'='APPROVED' THEN 'Approved training materials' ELSE 'Rejected training materials' END,
      v_note, v_from, v_from);

    SELECT count(*) FILTER (WHERE decision IS NULL), count(*) FILTER (WHERE decision='REJECTED')
      INTO v_pending, v_rejected FROM public.p2a_vcr_training_reviewers WHERE training_id=p_training_id;

    IF v_rejected > 0 THEN
      UPDATE public.user_tasks SET status='cancelled_superseded', updated_at=now()
       WHERE source_plan_table='p2a_vcr_training' AND source_plan_id=p_training_id
         AND type='training_review' AND status IN ('pending','in_progress');
      v_to := 'AWAITING_MATERIALS';
    ELSIF v_pending = 0 THEN
      v_to := 'AWAITING_ATTENDANCE_LIST';
    ELSE
      RETURN jsonb_build_object('ok',true,'status',v_from::text,'pending_reviews',v_pending);
    END IF;
  ELSIF p_action = 'provide_attendance' THEN
    IF v_from <> 'AWAITING_ATTENDANCE_LIST' THEN RAISE EXCEPTION 'invalid transition from %', v_from; END IF;
    UPDATE public.p2a_vcr_training SET attendance_provided_at=now(), attendance_provided_by=v_caller WHERE id=p_training_id;
    v_to := 'READY_TO_SCHEDULE';
  ELSIF p_action = 'schedule_training' THEN
    IF v_from <> 'READY_TO_SCHEDULE' THEN RAISE EXCEPTION 'invalid transition from %', v_from; END IF;
    UPDATE public.p2a_vcr_training
       SET scheduled_date=NULLIF(p_payload->>'scheduled_date','')::date,
           scheduled_start_time=p_payload->>'scheduled_start_time',
           scheduled_end_time=p_payload->>'scheduled_end_time',
           scheduled_location=p_payload->>'scheduled_location',
           scheduled_notes=p_payload->>'scheduled_notes',
           scheduled_at=now(), scheduled_by=v_caller
     WHERE id=p_training_id;
    v_to := 'SCHEDULED';
  ELSIF p_action = 'complete_training' THEN
    IF v_from <> 'SCHEDULED' THEN RAISE EXCEPTION 'invalid transition from %', v_from; END IF;
    UPDATE public.p2a_vcr_training SET outcome_summary=p_payload->>'outcome_summary', completed_at=now(), completed_by=v_caller WHERE id=p_training_id;
    v_to := 'COMPLETED';
  ELSE RAISE EXCEPTION 'unknown action: %', p_action;
  END IF;

  IF p_action <> 'submit_review' THEN
    v_owner_role := public._training_owner_role(v_from);
    IF v_owner_role IS NOT NULL THEN
      v_owner := public.resolve_project_role_user(v_ctx.project_id, v_owner_role);
      IF v_owner IS NULL OR v_owner <> v_caller THEN RAISE EXCEPTION 'only the % can perform %', v_owner_role, p_action; END IF;
    END IF;
  END IF;

  UPDATE public.p2a_vcr_training SET status=v_to WHERE id=p_training_id;
  PERFORM public._training_close_open_tasks(p_training_id);

  IF v_to = 'MATERIALS_UNDER_REVIEW' THEN
    PERFORM public._training_create_reviewer_tasks(
      p_training_id, v_ctx.project_id, v_ctx.project_code,
      v_ctx.vcr_code, v_ctx.handover_point_id, v_ctx.title, v_ctx.tenant_id);
  ELSE
    PERFORM public._training_create_owner_task(
      p_training_id, v_to, v_ctx.project_id, v_ctx.project_code,
      v_ctx.vcr_code, v_ctx.handover_point_id, v_ctx.title, v_ctx.tenant_id);
  END IF;

  IF p_action <> 'submit_review' THEN
    INSERT INTO public.p2a_vcr_training_activity_log(training_id,user_id,action,comment,from_status,to_status)
    VALUES (p_training_id, v_caller,
      CASE p_action
        WHEN 'request_po'         THEN 'Requested PO'
        WHEN 'provide_po'         THEN 'Provided PO'
        WHEN 'upload_materials'   THEN CASE WHEN EXISTS(SELECT 1 FROM public.p2a_vcr_training_activity_log WHERE training_id=p_training_id AND from_status='MATERIALS_UNDER_REVIEW' AND to_status='AWAITING_MATERIALS') THEN 'Re-uploaded training materials' ELSE 'Uploaded training materials' END
        WHEN 'provide_attendance' THEN 'Provided attendance list'
        WHEN 'schedule_training'  THEN 'Scheduled training'
        WHEN 'complete_training'  THEN 'Completed training'
      END, v_note, v_from, v_to);
  END IF;

  RETURN jsonb_build_object('ok',true,'from',v_from::text,'to',v_to::text);
END; $$;

GRANT EXECUTE ON FUNCTION public.advance_training_status(uuid, text, jsonb) TO authenticated;

-- Owner-gated RLS
DROP POLICY IF EXISTS "training reviewers writable by authenticated" ON public.p2a_vcr_training_reviewers;
DROP POLICY IF EXISTS "training attachments writable by authenticated" ON public.p2a_vcr_training_attachments;
DROP POLICY IF EXISTS "training activity log writable by authenticated" ON public.p2a_vcr_training_activity_log;
DROP POLICY IF EXISTS "training reviewers self-update own row" ON public.p2a_vcr_training_reviewers;
CREATE POLICY "training reviewers self-update own row" ON public.p2a_vcr_training_reviewers
  FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
DROP POLICY IF EXISTS "training attachments insert own upload" ON public.p2a_vcr_training_attachments;
CREATE POLICY "training attachments insert own upload" ON public.p2a_vcr_training_attachments
  FOR INSERT TO authenticated WITH CHECK (uploaded_by=auth.uid());

-- QAQC view + catalog
CREATE OR REPLACE VIEW public.v_training_workflow_state AS
SELECT
  t.id AS training_id, t.title AS training_title, t.status AS training_status,
  hp.id AS handover_point_id, hp.vcr_code, p.id AS project_id,
  public._training_owner_role(t.status) AS owner_role,
  public.resolve_project_role_user(p.id, public._training_owner_role(t.status)) AS expected_owner_user_id,
  (SELECT count(*) FROM public.user_tasks ut
    WHERE ut.source_plan_table='p2a_vcr_training' AND ut.source_plan_id=t.id
      AND ut.type='training_action' AND ut.status IN ('pending','in_progress','waiting')) AS open_owner_task_count,
  (SELECT count(*) FROM public.user_tasks ut
    WHERE ut.source_plan_table='p2a_vcr_training' AND ut.source_plan_id=t.id
      AND ut.type='training_review' AND ut.status IN ('pending','in_progress','waiting')) AS open_reviewer_task_count,
  (SELECT count(*) FROM public.p2a_vcr_training_reviewers tr
    WHERE tr.training_id=t.id AND tr.decision IS NULL) AS pending_reviewer_row_count
FROM public.p2a_vcr_training t
JOIN public.p2a_handover_points hp ON hp.id = t.handover_point_id
JOIN public.p2a_handover_plans php ON php.id = hp.handover_plan_id
JOIN public.projects p ON p.id = php.project_id;

GRANT SELECT ON public.v_training_workflow_state TO authenticated, service_role;

DO $$
DECLARE has_catalog boolean;
BEGIN
  SELECT to_regclass('public.qaqc_checks_catalog') IS NOT NULL INTO has_catalog;
  IF has_catalog THEN
    INSERT INTO public.qaqc_checks_catalog(code, name, sql, category, severity) VALUES
      ('T-001','Training: exactly one open owner task per non-terminal training',
$SQL$
SELECT training_id, training_status, vcr_code, open_owner_task_count
  FROM public.v_training_workflow_state
 WHERE training_status NOT IN ('COMPLETED','MATERIALS_UNDER_REVIEW')
   AND open_owner_task_count <> 1
$SQL$, 'training','error'),
      ('T-002','Training: reviewer tasks match pending reviewer rows in MATERIALS_UNDER_REVIEW',
$SQL$
SELECT training_id, training_status, vcr_code, open_reviewer_task_count, pending_reviewer_row_count
  FROM public.v_training_workflow_state
 WHERE training_status='MATERIALS_UNDER_REVIEW'
   AND open_reviewer_task_count <> pending_reviewer_row_count
$SQL$, 'training','error'),
      ('T-003','Training: no legacy status text remaining',
$SQL$
SELECT id, title, status::text FROM public.p2a_vcr_training
 WHERE status::text IN ('planned','delivered','complete','competency_verified')
$SQL$, 'training','error')
    ON CONFLICT (code) DO UPDATE SET sql=EXCLUDED.sql, name=EXCLUDED.name;
  END IF;
END $$;

-- Seeds -----------------------------------------------------
DO $$
DECLARE
  v_hp uuid := '96b44257-5c3b-4ec8-be04-1ada2d792257';
  v_project uuid := '76901c6c-927d-4266-aaea-bc036888f274';
  v_project_code text := 'DP-300';
  v_vcr_code text := 'VCR-DP300-02';
  v_tenant uuid := '63c14b6f-66d9-4963-bcd2-287662d538e2';
  v_snr_ora uuid := '49d052ff-e30f-4b1f-b10b-7edeb83db97e';
  v_proj_engr uuid := '03358598-483d-40c9-a668-35bd88d9cdab';
  v_dpd uuid := '4f911475-2022-4a0c-bfea-1a4263677c03';
  v_process_ta uuid := 'b502edf2-984a-44f4-855c-ede788fa0d5e';
  v_elect_ta uuid := '49dc0c20-4689-41f6-9984-a2f6e280e946';
  v_paco_ta uuid := '4773dc8f-6f91-48e2-8bd2-54d9cce8e74c';
  v_ts_ta uuid := '5a651906-a022-4084-af11-afe35a03cef1';
  v_d_process uuid := '0d430a07-c757-4c28-b54d-9f5cb429c928';
  v_d_paco uuid := '5d076d2a-8e48-4a95-b6be-6aeb48be3941';
  v_d_ts uuid := '4f92bf19-201b-4fcb-8c55-509aca8efde8';
  v_t_dcs uuid := 'efd26399-a017-4f5b-bdcb-4182fa3c822a';
  v_t_teg uuid := '22f77a5b-d32d-45bb-b68f-44ec3d3cece9';
  v_t_flare uuid := 'aea77344-167a-41d0-9140-72e64143d086';
  v_t_drain uuid := 'befc87d5-3ec5-4bdf-aa2c-c9e0f343b8ff';
  v_t_ns uuid; v_t_po uuid; v_t_mat uuid; v_t_rev uuid;
BEGIN
  SELECT id INTO v_t_ns  FROM public.p2a_vcr_training WHERE handover_point_id=v_hp AND title='Fire & Gas Detection System Familiarization';
  SELECT id INTO v_t_po  FROM public.p2a_vcr_training WHERE handover_point_id=v_hp AND title='Emergency Depressurization (EDP) Operations';
  SELECT id INTO v_t_mat FROM public.p2a_vcr_training WHERE handover_point_id=v_hp AND title='HP/LP Separator Operation Training';
  SELECT id INTO v_t_rev FROM public.p2a_vcr_training WHERE handover_point_id=v_hp AND title='Corrosion Monitoring & Sampling';
  v_t_ns  := COALESCE(v_t_ns,  gen_random_uuid());
  v_t_po  := COALESCE(v_t_po,  gen_random_uuid());
  v_t_mat := COALESCE(v_t_mat, gen_random_uuid());
  v_t_rev := COALESCE(v_t_rev, gen_random_uuid());

  DELETE FROM public.user_tasks WHERE source_plan_table='p2a_vcr_training'
     AND source_plan_id IN (SELECT id FROM public.p2a_vcr_training WHERE handover_point_id=v_hp);

  UPDATE public.p2a_vcr_training
     SET status='COMPLETED', discipline_id=v_d_paco,
         completed_at=now()-interval '10 days', completed_by=v_snr_ora,
         outcome_summary='All attendees demonstrated competency on the DCS console; assessment records archived under Assai.',
         po_number='PO-2026-0417', po_provided_at=now()-interval '30 days', po_provided_by=v_proj_engr,
         attendance_provided_at=now()-interval '20 days', attendance_provided_by=v_dpd,
         scheduled_date=(now()-interval '12 days')::date,
         scheduled_start_time='08:30', scheduled_end_time='16:30',
         scheduled_location='Simulator Room A, Training Centre',
         scheduled_notes='DCS console familiarisation — see VCR + training links.',
         scheduled_at=now()-interval '15 days', scheduled_by=v_snr_ora
   WHERE id=v_t_dcs;

  UPDATE public.p2a_vcr_training
     SET status='SCHEDULED', discipline_id=v_d_process,
         po_number='PO-2026-0512', po_provided_at=now()-interval '25 days', po_provided_by=v_proj_engr,
         attendance_provided_at=now()-interval '12 days', attendance_provided_by=v_dpd,
         scheduled_date=(now()+interval '9 days')::date,
         scheduled_start_time='09:00', scheduled_end_time='12:00',
         scheduled_location='Meeting Room B2, OSBL Admin Block',
         scheduled_notes='Operator familiarisation on TEG regeneration package.',
         scheduled_at=now()-interval '5 days', scheduled_by=v_snr_ora
   WHERE id=v_t_teg;

  UPDATE public.p2a_vcr_training
     SET status='READY_TO_SCHEDULE', discipline_id=v_d_ts,
         po_number='PO-2026-0534', po_provided_at=now()-interval '20 days', po_provided_by=v_proj_engr,
         attendance_provided_at=now()-interval '4 days', attendance_provided_by=v_dpd
   WHERE id=v_t_flare;

  UPDATE public.p2a_vcr_training
     SET status='AWAITING_ATTENDANCE_LIST', discipline_id=v_d_process,
         po_number='PO-2026-0561', po_provided_at=now()-interval '15 days', po_provided_by=v_proj_engr
   WHERE id=v_t_drain;

  INSERT INTO public.p2a_vcr_training(
    id, handover_point_id, title, description, status, discipline_id,
    duration_hours, target_date, target_audience, delivery_method, display_order, created_by
  ) VALUES
    (v_t_ns,  v_hp, 'Fire & Gas Detection System Familiarization',
     'Operator briefing on the F&G matrix, cause & effect, common alarms and response procedures for the OSBL package.',
     'NOT_STARTED', v_d_ts, 6, (now()+interval '45 days')::date,
     ARRAY['Panel Operators','Field Operators']::text[], ARRAY['Classroom']::text[], 90, v_snr_ora),
    (v_t_po,  v_hp, 'Emergency Depressurization (EDP) Operations',
     'Hands-on walkthrough of EDP initiation logic, blow-down valve sequencing, and post-EDP recovery steps.',
     'AWAITING_PO', v_d_process, 8, (now()+interval '38 days')::date,
     ARRAY['Panel Operators','Shift Supervisors']::text[], ARRAY['Classroom','Simulator']::text[], 100, v_snr_ora),
    (v_t_mat, v_hp, 'HP/LP Separator Operation Training',
     'Vessel level control, PSV set points, interlocks with flare and closed drain systems.',
     'AWAITING_MATERIALS', v_d_process, 10, (now()+interval '30 days')::date,
     ARRAY['Field Operators']::text[], ARRAY['Classroom','On-the-job']::text[], 110, v_snr_ora),
    (v_t_rev, v_hp, 'Corrosion Monitoring & Sampling',
     'Coupon retrieval, sample bomb operation, HSE precautions and sample submission workflow.',
     'MATERIALS_UNDER_REVIEW', v_d_process, 6, (now()+interval '25 days')::date,
     ARRAY['Field Operators','Inspectors']::text[], ARRAY['Classroom','On-the-job']::text[], 120, v_snr_ora)
  ON CONFLICT (id) DO UPDATE
    SET status=EXCLUDED.status, discipline_id=EXCLUDED.discipline_id,
        description=EXCLUDED.description, duration_hours=EXCLUDED.duration_hours,
        target_date=EXCLUDED.target_date, target_audience=EXCLUDED.target_audience,
        delivery_method=EXCLUDED.delivery_method, display_order=EXCLUDED.display_order;

  UPDATE public.p2a_vcr_training SET po_number='PO-2026-0602', po_provided_at=now()-interval '10 days', po_provided_by=v_proj_engr WHERE id=v_t_mat;
  UPDATE public.p2a_vcr_training SET po_number='PO-2026-0603', po_provided_at=now()-interval '9 days',  po_provided_by=v_proj_engr WHERE id=v_t_rev;

  DELETE FROM public.p2a_vcr_training_reviewers WHERE training_id=v_t_rev;
  INSERT INTO public.p2a_vcr_training_reviewers(training_id, user_id, role_label, added_by) VALUES
    (v_t_rev, v_process_ta, 'Process TA2 – Project', v_snr_ora),
    (v_t_rev, v_paco_ta,    'PACO TA2 – Project',    v_snr_ora);

  DELETE FROM public.p2a_vcr_training_attachments WHERE training_id IN (v_t_dcs,v_t_teg,v_t_flare,v_t_drain,v_t_ns,v_t_po,v_t_mat,v_t_rev);
  INSERT INTO public.p2a_vcr_training_attachments(training_id, kind, file_name, file_path, file_type, uploaded_by) VALUES
    (v_t_dcs,'po','PO-2026-0417.pdf','seed/dp300/dcs/po-2026-0417.pdf','application/pdf',v_proj_engr),
    (v_t_dcs,'materials','DCS_Console_Familiarisation_v3.pdf','seed/dp300/dcs/materials-v3.pdf','application/pdf',v_snr_ora),
    (v_t_dcs,'attendance','DCS_Attendance_List.pdf','seed/dp300/dcs/attendance.pdf','application/pdf',v_dpd),
    (v_t_dcs,'evidence','DCS_Assessment_Records.pdf','seed/dp300/dcs/assessments.pdf','application/pdf',v_snr_ora),
    (v_t_dcs,'evidence','DCS_Training_Photos.zip','seed/dp300/dcs/photos.zip','application/zip',v_snr_ora),
    (v_t_teg,'po','PO-2026-0512.pdf','seed/dp300/teg/po.pdf','application/pdf',v_proj_engr),
    (v_t_teg,'materials','TEG_Regen_Ops_v1.pdf','seed/dp300/teg/materials.pdf','application/pdf',v_snr_ora),
    (v_t_teg,'attendance','TEG_Attendance_List.pdf','seed/dp300/teg/attendance.pdf','application/pdf',v_dpd),
    (v_t_flare,'po','PO-2026-0534.pdf','seed/dp300/flare/po.pdf','application/pdf',v_proj_engr),
    (v_t_flare,'materials','Flare_Safety_v2.pdf','seed/dp300/flare/materials.pdf','application/pdf',v_snr_ora),
    (v_t_flare,'attendance','Flare_Attendance_List.pdf','seed/dp300/flare/attendance.pdf','application/pdf',v_dpd),
    (v_t_drain,'po','PO-2026-0561.pdf','seed/dp300/drain/po.pdf','application/pdf',v_proj_engr),
    (v_t_drain,'materials','Closed_Drain_Awareness_v1.pdf','seed/dp300/drain/materials.pdf','application/pdf',v_snr_ora),
    (v_t_mat,'po','PO-2026-0602.pdf','seed/dp300/sep/po.pdf','application/pdf',v_proj_engr),
    (v_t_rev,'po','PO-2026-0603.pdf','seed/dp300/corr/po.pdf','application/pdf',v_proj_engr),
    (v_t_rev,'materials','Corrosion_Monitoring_Draft_v1.pdf','seed/dp300/corr/materials-v1.pdf','application/pdf',v_snr_ora);

  DELETE FROM public.p2a_vcr_training_activity_log WHERE training_id IN (v_t_dcs,v_t_teg,v_t_flare,v_t_drain,v_t_ns,v_t_po,v_t_mat,v_t_rev);
  INSERT INTO public.p2a_vcr_training_activity_log(training_id,user_id,action,comment,from_status,to_status,created_at) VALUES
    (v_t_dcs,v_snr_ora,'Requested PO','Console familiarisation needed before RFO.','NOT_STARTED','AWAITING_PO', now()-interval '35 days'),
    (v_t_dcs,v_proj_engr,'Provided PO','PO-2026-0417 raised.','AWAITING_PO','AWAITING_MATERIALS', now()-interval '30 days'),
    (v_t_dcs,v_snr_ora,'Uploaded training materials','v3 pack circulated to Elect + PACO TA2.','AWAITING_MATERIALS','MATERIALS_UNDER_REVIEW', now()-interval '28 days'),
    (v_t_dcs,v_elect_ta,'Approved training materials','Records accepted, no punch items.','MATERIALS_UNDER_REVIEW','MATERIALS_UNDER_REVIEW', now()-interval '25 days'),
    (v_t_dcs,v_paco_ta,'Approved training materials','Aligned with PACO scope.','MATERIALS_UNDER_REVIEW','AWAITING_ATTENDANCE_LIST', now()-interval '24 days'),
    (v_t_dcs,v_dpd,'Provided attendance list','12 attendees confirmed.','AWAITING_ATTENDANCE_LIST','READY_TO_SCHEDULE', now()-interval '20 days'),
    (v_t_dcs,v_snr_ora,'Scheduled training','Simulator Room A booked.','READY_TO_SCHEDULE','SCHEDULED', now()-interval '15 days'),
    (v_t_dcs,v_snr_ora,'Completed training','All attendees demonstrated competency; certificates issued.','SCHEDULED','COMPLETED', now()-interval '10 days'),
    (v_t_teg,v_snr_ora,'Requested PO',NULL,'NOT_STARTED','AWAITING_PO', now()-interval '30 days'),
    (v_t_teg,v_proj_engr,'Provided PO','PO-2026-0512 raised.','AWAITING_PO','AWAITING_MATERIALS', now()-interval '25 days'),
    (v_t_teg,v_snr_ora,'Uploaded training materials',NULL,'AWAITING_MATERIALS','MATERIALS_UNDER_REVIEW', now()-interval '22 days'),
    (v_t_teg,v_process_ta,'Approved training materials','Good coverage of dew-point monitoring.','MATERIALS_UNDER_REVIEW','AWAITING_ATTENDANCE_LIST', now()-interval '18 days'),
    (v_t_teg,v_dpd,'Provided attendance list',NULL,'AWAITING_ATTENDANCE_LIST','READY_TO_SCHEDULE', now()-interval '12 days'),
    (v_t_teg,v_snr_ora,'Scheduled training','Room B2 booked.','READY_TO_SCHEDULE','SCHEDULED', now()-interval '5 days'),
    (v_t_flare,v_snr_ora,'Requested PO',NULL,'NOT_STARTED','AWAITING_PO', now()-interval '25 days'),
    (v_t_flare,v_proj_engr,'Provided PO','PO-2026-0534 raised.','AWAITING_PO','AWAITING_MATERIALS', now()-interval '20 days'),
    (v_t_flare,v_snr_ora,'Uploaded training materials',NULL,'AWAITING_MATERIALS','MATERIALS_UNDER_REVIEW', now()-interval '15 days'),
    (v_t_flare,v_ts_ta,'Approved training materials','Emergency response section is thorough.','MATERIALS_UNDER_REVIEW','AWAITING_ATTENDANCE_LIST', now()-interval '10 days'),
    (v_t_flare,v_dpd,'Provided attendance list',NULL,'AWAITING_ATTENDANCE_LIST','READY_TO_SCHEDULE', now()-interval '4 days'),
    (v_t_drain,v_snr_ora,'Requested PO',NULL,'NOT_STARTED','AWAITING_PO', now()-interval '20 days'),
    (v_t_drain,v_proj_engr,'Provided PO','PO-2026-0561 raised.','AWAITING_PO','AWAITING_MATERIALS', now()-interval '15 days'),
    (v_t_drain,v_snr_ora,'Uploaded training materials',NULL,'AWAITING_MATERIALS','MATERIALS_UNDER_REVIEW', now()-interval '10 days'),
    (v_t_drain,v_process_ta,'Approved training materials','Aligned with hydrocarbon containment procedures.','MATERIALS_UNDER_REVIEW','AWAITING_ATTENDANCE_LIST', now()-interval '6 days'),
    (v_t_rev,v_snr_ora,'Requested PO',NULL,'NOT_STARTED','AWAITING_PO', now()-interval '14 days'),
    (v_t_rev,v_proj_engr,'Provided PO','PO-2026-0603 raised.','AWAITING_PO','AWAITING_MATERIALS', now()-interval '9 days'),
    (v_t_rev,v_snr_ora,'Uploaded training materials','Draft v1 shared for review with Process + PACO TA2.','AWAITING_MATERIALS','MATERIALS_UNDER_REVIEW', now()-interval '3 days'),
    (v_t_po,v_snr_ora,'Requested PO','EDP operations training required ahead of RFO.','NOT_STARTED','AWAITING_PO', now()-interval '2 days'),
    (v_t_mat,v_snr_ora,'Requested PO',NULL,'NOT_STARTED','AWAITING_PO', now()-interval '12 days'),
    (v_t_mat,v_proj_engr,'Provided PO','PO-2026-0602 raised.','AWAITING_PO','AWAITING_MATERIALS', now()-interval '7 days');

  PERFORM public._training_create_owner_task(v_t_ns,   'NOT_STARTED',              v_project, v_project_code, v_vcr_code, v_hp, (SELECT title FROM public.p2a_vcr_training WHERE id=v_t_ns),   v_tenant);
  PERFORM public._training_create_owner_task(v_t_po,   'AWAITING_PO',              v_project, v_project_code, v_vcr_code, v_hp, (SELECT title FROM public.p2a_vcr_training WHERE id=v_t_po),   v_tenant);
  PERFORM public._training_create_owner_task(v_t_mat,  'AWAITING_MATERIALS',       v_project, v_project_code, v_vcr_code, v_hp, (SELECT title FROM public.p2a_vcr_training WHERE id=v_t_mat),  v_tenant);
  PERFORM public._training_create_reviewer_tasks(v_t_rev, v_project, v_project_code, v_vcr_code, v_hp,        (SELECT title FROM public.p2a_vcr_training WHERE id=v_t_rev),  v_tenant);
  PERFORM public._training_create_owner_task(v_t_drain,'AWAITING_ATTENDANCE_LIST', v_project, v_project_code, v_vcr_code, v_hp, (SELECT title FROM public.p2a_vcr_training WHERE id=v_t_drain),v_tenant);
  PERFORM public._training_create_owner_task(v_t_flare,'READY_TO_SCHEDULE',        v_project, v_project_code, v_vcr_code, v_hp, (SELECT title FROM public.p2a_vcr_training WHERE id=v_t_flare),v_tenant);
  PERFORM public._training_create_owner_task(v_t_teg,  'SCHEDULED',                v_project, v_project_code, v_vcr_code, v_hp, (SELECT title FROM public.p2a_vcr_training WHERE id=v_t_teg),  v_tenant);
END $$;
