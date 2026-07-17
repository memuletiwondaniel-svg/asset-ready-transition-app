
-- 1) Drop all miswired FKs to profiles(id) across the procedure family.
ALTER TABLE public.p2a_vcr_procedures
  DROP CONSTRAINT IF EXISTS p2a_vcr_procedures_author_user_id_fkey,
  DROP CONSTRAINT IF EXISTS p2a_vcr_procedures_submitted_by_fkey;
ALTER TABLE public.p2a_vcr_procedure_approvers
  DROP CONSTRAINT IF EXISTS p2a_vcr_procedure_approvers_user_id_fkey;
ALTER TABLE public.p2a_vcr_procedure_attachments
  DROP CONSTRAINT IF EXISTS p2a_vcr_procedure_attachments_uploaded_by_fkey;
ALTER TABLE public.p2a_vcr_procedure_activity_log
  DROP CONSTRAINT IF EXISTS p2a_vcr_procedure_activity_log_user_id_fkey;

-- 2) Translate any legacy values (profiles.id → profiles.user_id).
UPDATE public.p2a_vcr_procedures pr
   SET author_user_id = p.user_id
  FROM public.profiles p
 WHERE pr.author_user_id = p.id AND pr.author_user_id <> p.user_id;
UPDATE public.p2a_vcr_procedures pr
   SET submitted_by = p.user_id
  FROM public.profiles p
 WHERE pr.submitted_by = p.id AND pr.submitted_by <> p.user_id;

-- 3) Re-add FKs targeting profiles(user_id) — consistent with auth.uid().
ALTER TABLE public.p2a_vcr_procedures
  ADD CONSTRAINT p2a_vcr_procedures_author_user_id_fkey
    FOREIGN KEY (author_user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  ADD CONSTRAINT p2a_vcr_procedures_submitted_by_fkey
    FOREIGN KEY (submitted_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
ALTER TABLE public.p2a_vcr_procedure_approvers
  ADD CONSTRAINT p2a_vcr_procedure_approvers_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.p2a_vcr_procedure_attachments
  ADD CONSTRAINT p2a_vcr_procedure_attachments_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
ALTER TABLE public.p2a_vcr_procedure_activity_log
  ADD CONSTRAINT p2a_vcr_procedure_activity_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Widen user_tasks allowlists ---------------------------------
ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_source_plan_table_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_source_plan_table_check
  CHECK (source_plan_table IS NULL OR source_plan_table = ANY (ARRAY[
    'orp_plans','p2a_handover_plans','p2a_handover_points',
    'p2a_vcr_training','p2a_vcr_procedures'
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
    'training_action','training_review',
    'procedure_action','procedure_review'
  ]));

CREATE OR REPLACE FUNCTION public._procedure_owner_role(p_status public.procedure_status)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_status
    WHEN 'NOT_STARTED'       THEN 'Snr ORA Engr'
    WHEN 'DRAFT'             THEN 'Snr ORA Engr'
    WHEN 'REWORK_REQUESTED'  THEN 'Snr ORA Engr'
    WHEN 'UNDER_REVIEW'      THEN NULL
    WHEN 'APPROVED'          THEN NULL
  END
$$;

CREATE OR REPLACE FUNCTION public._procedure_task_title(
  p_status public.procedure_status, p_vcr_code text, p_title text
) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_status
    WHEN 'NOT_STARTED'       THEN p_vcr_code || ': Start draft — ' || p_title
    WHEN 'DRAFT'             THEN p_vcr_code || ': Submit for review — ' || p_title
    WHEN 'REWORK_REQUESTED'  THEN p_vcr_code || ': Address review comments — ' || p_title
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public._procedure_close_open_tasks(p_procedure_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_tasks SET status='cancelled_superseded', updated_at=now()
   WHERE source_plan_table='p2a_vcr_procedures' AND source_plan_id=p_procedure_id
     AND status IN ('pending','in_progress','waiting');
$$;

CREATE OR REPLACE FUNCTION public._procedure_context(p_procedure_id uuid)
RETURNS TABLE(
  procedure_id uuid, title text, status public.procedure_status,
  author_user_id uuid, handover_point_id uuid, vcr_code text,
  project_id uuid, project_code text, tenant_id uuid
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pr.id, pr.title, pr.status, pr.author_user_id,
         hp.id, hp.vcr_code, p.id, php.project_code, p.tenant_id
    FROM public.p2a_vcr_procedures pr
    JOIN public.p2a_handover_points hp ON hp.id = pr.handover_point_id
    JOIN public.p2a_handover_plans php ON php.id = hp.handover_plan_id
    JOIN public.projects p ON p.id = php.project_id
   WHERE pr.id = p_procedure_id
$$;

CREATE OR REPLACE FUNCTION public._procedure_resolve_author(
  p_procedure_id uuid, p_project_id uuid
) RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_author uuid;
BEGIN
  SELECT author_user_id INTO v_author FROM public.p2a_vcr_procedures WHERE id=p_procedure_id;
  IF v_author IS NOT NULL THEN RETURN v_author; END IF;
  RETURN public.resolve_project_role_user(p_project_id, 'Snr ORA Engr');
END; $$;

CREATE OR REPLACE FUNCTION public._procedure_create_owner_task(
  p_procedure_id uuid, p_status public.procedure_status,
  p_project_id uuid, p_project_code text, p_vcr_code text,
  p_hp_id uuid, p_title text, p_tenant_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid; v_dedupe text; v_task_title text;
BEGIN
  IF public._procedure_owner_role(p_status) IS NULL THEN RETURN; END IF;
  v_user := public._procedure_resolve_author(p_procedure_id, p_project_id);
  IF v_user IS NULL THEN RETURN; END IF;
  v_dedupe := 'procedure:'||p_procedure_id::text||':step:'||p_status::text||':user:'||v_user::text;
  v_task_title := public._procedure_task_title(p_status, p_vcr_code, p_title);

  UPDATE public.user_tasks SET status='pending', title=v_task_title, updated_at=now()
   WHERE dedupe_key=v_dedupe;
  IF FOUND THEN RETURN; END IF;

  INSERT INTO public.user_tasks (
    user_id, title, priority, type, status,
    source_plan_table, source_plan_id, dedupe_key, tenant_id, metadata
  ) VALUES (
    v_user, v_task_title, 'Medium','procedure_action','pending',
    'p2a_vcr_procedures', p_procedure_id, v_dedupe, p_tenant_id,
    jsonb_build_object(
      'action','procedure_workflow','procedure_id',p_procedure_id,
      'procedure_status',p_status::text,'owner_role','Snr ORA Engr',
      'project_id',p_project_id,'project_code',p_project_code,
      'vcr_code',p_vcr_code,'point_id',p_hp_id,'source','p2a_vcr_procedures'
    )
  );
END; $$;

CREATE OR REPLACE FUNCTION public._procedure_create_reviewer_tasks(
  p_procedure_id uuid, p_project_id uuid, p_project_code text,
  p_vcr_code text, p_hp_id uuid, p_title text, p_tenant_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_dedupe text; v_title text;
BEGIN
  FOR r IN
    SELECT user_id, role_label FROM public.p2a_vcr_procedure_approvers
     WHERE procedure_id=p_procedure_id AND decision IS NULL
  LOOP
    v_dedupe := 'procedure:'||p_procedure_id::text||':step:UNDER_REVIEW:user:'||r.user_id::text;
    v_title := p_vcr_code || ': Review procedure — ' || p_title;
    UPDATE public.user_tasks SET status='pending', title=v_title, updated_at=now() WHERE dedupe_key=v_dedupe;
    IF NOT FOUND THEN
      INSERT INTO public.user_tasks (
        user_id, title, priority, type, status,
        source_plan_table, source_plan_id, dedupe_key, tenant_id, metadata
      ) VALUES (
        r.user_id, v_title, 'Medium','procedure_review','pending',
        'p2a_vcr_procedures', p_procedure_id, v_dedupe, p_tenant_id,
        jsonb_build_object(
          'action','procedure_review','procedure_id',p_procedure_id,
          'procedure_status','UNDER_REVIEW','reviewer_role',r.role_label,
          'project_id',p_project_id,'project_code',p_project_code,
          'vcr_code',p_vcr_code,'point_id',p_hp_id,'source','p2a_vcr_procedures'
        )
      );
    END IF;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.advance_procedure_status(
  p_procedure_id uuid, p_action text, p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_ctx record; v_from public.procedure_status; v_to public.procedure_status;
  v_author uuid; v_note text;
  v_pending int; v_rejected int; v_approver_row record;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_ctx FROM public._procedure_context(p_procedure_id);
  IF v_ctx.procedure_id IS NULL THEN RAISE EXCEPTION 'procedure not found: %', p_procedure_id; END IF;
  v_from := v_ctx.status;
  v_note := NULLIF(trim(coalesce(p_payload->>'comment','')), '');
  v_author := public._procedure_resolve_author(p_procedure_id, v_ctx.project_id);

  IF p_action = 'start_draft' THEN
    IF v_from <> 'NOT_STARTED' THEN RAISE EXCEPTION 'invalid transition from %', v_from; END IF;
    IF v_author IS NULL OR v_author <> v_caller THEN RAISE EXCEPTION 'only the Author can start the draft'; END IF;
    v_to := 'DRAFT';

  ELSIF p_action IN ('submit_review','resubmit') THEN
    IF p_action='submit_review' AND v_from <> 'DRAFT' THEN RAISE EXCEPTION 'invalid transition from %', v_from; END IF;
    IF p_action='resubmit'      AND v_from <> 'REWORK_REQUESTED' THEN RAISE EXCEPTION 'invalid transition from %', v_from; END IF;
    IF v_author IS NULL OR v_author <> v_caller THEN RAISE EXCEPTION 'only the Author can submit for review'; END IF;

    IF p_payload ? 'approvers' AND jsonb_typeof(p_payload->'approvers')='array' THEN
      DELETE FROM public.p2a_vcr_procedure_approvers WHERE procedure_id=p_procedure_id;
      INSERT INTO public.p2a_vcr_procedure_approvers(procedure_id, user_id, role_label)
      SELECT p_procedure_id, (r->>'user_id')::uuid, r->>'role_label'
        FROM jsonb_array_elements(p_payload->'approvers') AS r
       WHERE (r->>'user_id') IS NOT NULL
      ON CONFLICT (procedure_id, user_id) DO NOTHING;
    ELSE
      UPDATE public.p2a_vcr_procedure_approvers
         SET decision=NULL, comment=NULL, decided_at=NULL, markup_attachment_id=NULL
       WHERE procedure_id=p_procedure_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.p2a_vcr_procedure_approvers WHERE procedure_id=p_procedure_id) THEN
      RAISE EXCEPTION 'at least one approver is required';
    END IF;

    UPDATE public.p2a_vcr_procedures
       SET submitted_at=now(), submitted_by=v_caller
     WHERE id=p_procedure_id;
    v_to := 'UNDER_REVIEW';

  ELSIF p_action = 'submit_decision' THEN
    IF v_from <> 'UNDER_REVIEW' THEN RAISE EXCEPTION 'invalid transition from %', v_from; END IF;
    SELECT * INTO v_approver_row FROM public.p2a_vcr_procedure_approvers
      WHERE procedure_id=p_procedure_id AND user_id=v_caller;
    IF v_approver_row.id IS NULL THEN RAISE EXCEPTION 'caller is not an approver'; END IF;
    IF v_approver_row.decision IS NOT NULL THEN RAISE EXCEPTION 'approver decision already recorded'; END IF;
    IF (p_payload->>'decision') NOT IN ('APPROVED','REJECTED') THEN RAISE EXCEPTION 'decision must be APPROVED or REJECTED'; END IF;
    IF v_note IS NULL THEN RAISE EXCEPTION 'comment is required'; END IF;

    UPDATE public.p2a_vcr_procedure_approvers
       SET decision=p_payload->>'decision', comment=v_note, decided_at=now(),
           markup_attachment_id=NULLIF(p_payload->>'markup_attachment_id','')::uuid
     WHERE id=v_approver_row.id;

    UPDATE public.user_tasks SET status='completed', updated_at=now()
     WHERE source_plan_table='p2a_vcr_procedures' AND source_plan_id=p_procedure_id
       AND user_id=v_caller AND type='procedure_review' AND status IN ('pending','in_progress');

    INSERT INTO public.p2a_vcr_procedure_activity_log(procedure_id,user_id,action,comment,from_status,to_status)
    VALUES (p_procedure_id, v_caller,
      CASE WHEN p_payload->>'decision'='APPROVED' THEN 'Approved procedure' ELSE 'Rejected procedure' END,
      v_note, v_from, v_from);

    SELECT count(*) FILTER (WHERE decision IS NULL), count(*) FILTER (WHERE decision='REJECTED')
      INTO v_pending, v_rejected FROM public.p2a_vcr_procedure_approvers WHERE procedure_id=p_procedure_id;

    IF v_rejected > 0 THEN
      UPDATE public.user_tasks SET status='cancelled_superseded', updated_at=now()
       WHERE source_plan_table='p2a_vcr_procedures' AND source_plan_id=p_procedure_id
         AND type='procedure_review' AND status IN ('pending','in_progress');
      v_to := 'REWORK_REQUESTED';
    ELSIF v_pending = 0 THEN
      v_to := 'APPROVED';
      UPDATE public.p2a_vcr_procedures SET approved_at=now() WHERE id=p_procedure_id;
    ELSE
      RETURN jsonb_build_object('ok',true,'status',v_from::text,'pending_reviews',v_pending);
    END IF;

  ELSE
    RAISE EXCEPTION 'unknown action: %', p_action;
  END IF;

  UPDATE public.p2a_vcr_procedures SET status=v_to WHERE id=p_procedure_id;
  PERFORM public._procedure_close_open_tasks(p_procedure_id);

  IF v_to = 'UNDER_REVIEW' THEN
    PERFORM public._procedure_create_reviewer_tasks(
      p_procedure_id, v_ctx.project_id, v_ctx.project_code,
      v_ctx.vcr_code, v_ctx.handover_point_id, v_ctx.title, v_ctx.tenant_id);
  ELSE
    PERFORM public._procedure_create_owner_task(
      p_procedure_id, v_to, v_ctx.project_id, v_ctx.project_code,
      v_ctx.vcr_code, v_ctx.handover_point_id, v_ctx.title, v_ctx.tenant_id);
  END IF;

  IF p_action <> 'submit_decision' THEN
    INSERT INTO public.p2a_vcr_procedure_activity_log(procedure_id,user_id,action,comment,from_status,to_status)
    VALUES (p_procedure_id, v_caller,
      CASE p_action
        WHEN 'start_draft'    THEN 'Started draft'
        WHEN 'submit_review'  THEN 'Submitted for review'
        WHEN 'resubmit'       THEN 'Resubmitted for review'
      END, v_note, v_from, v_to);
  END IF;

  RETURN jsonb_build_object('ok',true,'from',v_from::text,'to',v_to::text);
END; $$;

GRANT EXECUTE ON FUNCTION public.advance_procedure_status(uuid, text, jsonb) TO authenticated;

DROP POLICY IF EXISTS procedure_approvers_placeholder_read  ON public.p2a_vcr_procedure_approvers;
DROP POLICY IF EXISTS procedure_approvers_placeholder_write ON public.p2a_vcr_procedure_approvers;
DROP POLICY IF EXISTS procedure_attachments_placeholder_read  ON public.p2a_vcr_procedure_attachments;
DROP POLICY IF EXISTS procedure_attachments_placeholder_write ON public.p2a_vcr_procedure_attachments;
DROP POLICY IF EXISTS procedure_activity_placeholder_read  ON public.p2a_vcr_procedure_activity_log;
DROP POLICY IF EXISTS procedure_activity_placeholder_write ON public.p2a_vcr_procedure_activity_log;

CREATE POLICY "procedure approvers readable" ON public.p2a_vcr_procedure_approvers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "procedure approvers self-update own pending row" ON public.p2a_vcr_procedure_approvers
  FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

CREATE POLICY "procedure attachments readable" ON public.p2a_vcr_procedure_attachments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "procedure attachments insert own upload" ON public.p2a_vcr_procedure_attachments
  FOR INSERT TO authenticated WITH CHECK (uploaded_by=auth.uid());

CREATE POLICY "procedure activity readable" ON public.p2a_vcr_procedure_activity_log
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE VIEW public.v_procedure_workflow_state AS
SELECT
  pr.id AS procedure_id, pr.title AS procedure_title, pr.status AS procedure_status,
  hp.id AS handover_point_id, hp.vcr_code, p.id AS project_id,
  public._procedure_owner_role(pr.status) AS owner_role,
  public._procedure_resolve_author(pr.id, p.id) AS expected_owner_user_id,
  (SELECT count(*) FROM public.user_tasks ut
    WHERE ut.source_plan_table='p2a_vcr_procedures' AND ut.source_plan_id=pr.id
      AND ut.type='procedure_action' AND ut.status IN ('pending','in_progress','waiting')) AS open_owner_task_count,
  (SELECT count(*) FROM public.user_tasks ut
    WHERE ut.source_plan_table='p2a_vcr_procedures' AND ut.source_plan_id=pr.id
      AND ut.type='procedure_review' AND ut.status IN ('pending','in_progress','waiting')) AS open_reviewer_task_count,
  (SELECT count(*) FROM public.p2a_vcr_procedure_approvers ap
    WHERE ap.procedure_id=pr.id AND ap.decision IS NULL) AS pending_approver_row_count
FROM public.p2a_vcr_procedures pr
JOIN public.p2a_handover_points hp ON hp.id = pr.handover_point_id
JOIN public.p2a_handover_plans php ON php.id = hp.handover_plan_id
JOIN public.projects p ON p.id = php.project_id;

GRANT SELECT ON public.v_procedure_workflow_state TO authenticated, service_role;

DO $$
DECLARE has_catalog boolean;
BEGIN
  SELECT to_regclass('public.qaqc_checks_catalog') IS NOT NULL INTO has_catalog;
  IF has_catalog THEN
    INSERT INTO public.qaqc_checks_catalog(code, name, sql, category, severity) VALUES
      ('P-001','Procedures: exactly one open owner task per author-owned status',
$SQL$
SELECT procedure_id, procedure_status, vcr_code, open_owner_task_count
  FROM public.v_procedure_workflow_state
 WHERE procedure_status IN ('NOT_STARTED','DRAFT','REWORK_REQUESTED')
   AND open_owner_task_count <> 1
$SQL$, 'procedures','error'),
      ('P-002','Procedures: reviewer tasks match pending approver rows in UNDER_REVIEW',
$SQL$
SELECT procedure_id, procedure_status, vcr_code, open_reviewer_task_count, pending_approver_row_count
  FROM public.v_procedure_workflow_state
 WHERE procedure_status='UNDER_REVIEW'
   AND open_reviewer_task_count <> pending_approver_row_count
$SQL$, 'procedures','error'),
      ('P-003','Procedures: no legacy status text remaining',
$SQL$
SELECT id, title, status::text FROM public.p2a_vcr_procedures
 WHERE status::text IN ('to_develop','in_review','issued','complete','approved','delivered','planned')
$SQL$, 'procedures','error'),
      ('P-004','Procedures: APPROVED has zero open owner/reviewer tasks',
$SQL$
SELECT procedure_id, procedure_status, vcr_code, open_owner_task_count, open_reviewer_task_count
  FROM public.v_procedure_workflow_state
 WHERE procedure_status='APPROVED'
   AND (open_owner_task_count > 0 OR open_reviewer_task_count > 0)
$SQL$, 'procedures','error')
    ON CONFLICT (code) DO UPDATE SET sql=EXCLUDED.sql, name=EXCLUDED.name;
  END IF;
END $$;

-- Seeds --------------------------------------------------------
DO $$
DECLARE
  v_hp uuid           := '96b44257-5c3b-4ec8-be04-1ada2d792257';
  v_project uuid      := '76901c6c-927d-4266-aaea-bc036888f274';
  v_project_code text := 'DP-300';
  v_vcr_code text     := 'VCR-DP300-02';
  v_tenant uuid       := '63c14b6f-66d9-4963-bcd2-287662d538e2';
  v_snr_ora uuid      := '49d052ff-e30f-4b1f-b10b-7edeb83db97e';
  v_process_ta uuid   := 'b502edf2-984a-44f4-855c-ede788fa0d5e';
  v_paco_ta uuid      := '4773dc8f-6f91-48e2-8bd2-54d9cce8e74c';
  v_elect_ta uuid     := '49dc0c20-4689-41f6-9984-a2f6e280e946';
  v_d_process uuid    := '0d430a07-c757-4c28-b54d-9f5cb429c928';
  v_d_paco uuid       := '5d076d2a-8e48-4a95-b6be-6aeb48be3941';
  v_ex_slug uuid      := 'e9f0d00d-898d-4fc9-abe7-f3bc292f67d7';
  v_ex_teg uuid       := '0a1c69b2-6da3-4a0b-b9c5-d13d67b60eef';
  v_p_approved uuid; v_p_review uuid; v_p_ns uuid; v_p_draft uuid; v_p_rework uuid;
BEGIN
  v_p_approved := v_ex_slug;
  v_p_review   := v_ex_teg;

  DELETE FROM public.user_tasks WHERE source_plan_table='p2a_vcr_procedures'
     AND source_plan_id IN (SELECT id FROM public.p2a_vcr_procedures WHERE handover_point_id=v_hp);
  DELETE FROM public.p2a_vcr_procedure_approvers   WHERE procedure_id IN (SELECT id FROM public.p2a_vcr_procedures WHERE handover_point_id=v_hp);
  DELETE FROM public.p2a_vcr_procedure_activity_log WHERE procedure_id IN (SELECT id FROM public.p2a_vcr_procedures WHERE handover_point_id=v_hp);
  DELETE FROM public.p2a_vcr_procedure_attachments  WHERE procedure_id IN (SELECT id FROM public.p2a_vcr_procedures WHERE handover_point_id=v_hp);
  DELETE FROM public.p2a_vcr_procedures WHERE handover_point_id=v_hp AND id NOT IN (v_p_approved, v_p_review);

  UPDATE public.p2a_vcr_procedures SET
    title='Slug Catcher Startup Procedure',
    description='Cold start of the inlet slug catcher — line-up, warm-up, level control ramp and hand-over to Operating procedure.',
    procedure_type='STARTUP', change_type='NEW',
    document_number='6529-BGC-DP300-PROC-OA-6039-00021-00001',
    status='APPROVED', discipline_id=v_d_process,
    author_user_id=v_snr_ora, submitted_by=v_snr_ora,
    submitted_at=now()-interval '18 days', approved_at=now()-interval '4 days',
    responsible_person=NULL, target_date=(now()-interval '4 days')::date, display_order=10
   WHERE id=v_p_approved;

  UPDATE public.p2a_vcr_procedures SET
    title='TEG Regeneration Startup Procedure',
    description='Startup of the TEG regeneration package including reboiler warm-up, still column stabilisation and lean/rich TEG circulation.',
    procedure_type='STARTUP', change_type='NEW',
    document_number='6529-BGC-DP300-PROC-OA-6039-00022-00001',
    status='UNDER_REVIEW', discipline_id=v_d_process,
    author_user_id=v_snr_ora, submitted_by=v_snr_ora,
    submitted_at=now()-interval '3 days',
    approved_at=NULL, responsible_person=NULL, display_order=30
   WHERE id=v_p_review;

  INSERT INTO public.p2a_vcr_procedures(
    id, handover_point_id, title, description, procedure_type, change_type,
    document_number, status, discipline_id, author_user_id, display_order
  ) VALUES
    (gen_random_uuid(), v_hp, 'Fuel Gas Conditioning Startup Procedure',
     'Line-up and startup of the fuel gas conditioning skid feeding generators and flare pilots.',
     'STARTUP','NEW','6529-BGC-DP300-PROC-OA-6039-00023-00001','NOT_STARTED', v_d_process, v_snr_ora, 20),
    (gen_random_uuid(), v_hp, 'Closed Drain System Operating Procedure',
     'Normal operating procedure for the closed drain header, drum level control and pump-out cycles.',
     'OPERATING','UPDATE','6529-BGC-DP300-PROC-OA-6039-00024-00001','DRAFT', v_d_process, v_snr_ora, 40),
    (gen_random_uuid(), v_hp, 'Flare System Purge & Light-Off Procedure',
     'Cold light-off of the elevated flare including nitrogen purge, pilot ignition sequence and stack integrity checks.',
     'STARTUP','NEW','6529-BGC-DP300-PROC-OA-6039-00025-00001','REWORK_REQUESTED', v_d_paco, v_snr_ora, 50);

  SELECT id INTO v_p_ns     FROM public.p2a_vcr_procedures WHERE handover_point_id=v_hp AND title='Fuel Gas Conditioning Startup Procedure';
  SELECT id INTO v_p_draft  FROM public.p2a_vcr_procedures WHERE handover_point_id=v_hp AND title='Closed Drain System Operating Procedure';
  SELECT id INTO v_p_rework FROM public.p2a_vcr_procedures WHERE handover_point_id=v_hp AND title='Flare System Purge & Light-Off Procedure';

  INSERT INTO public.p2a_vcr_procedure_approvers(procedure_id, user_id, role_label, decision, comment, decided_at) VALUES
    (v_p_approved, v_process_ta,'Process TA2 – Project','APPROVED','Line-up and warm-up ramps aligned with vendor package. Records accepted.', now()-interval '5 days'),
    (v_p_approved, v_paco_ta,   'PACO TA2 – Project',   'APPROVED','ESD interlocks and permissives correctly referenced. Approved.',           now()-interval '4 days');

  INSERT INTO public.p2a_vcr_procedure_attachments(procedure_id, kind, file_name, file_url, mime_type, uploaded_by) VALUES
    (v_p_approved,'draft','Slug_Catcher_Startup_v3.pdf','seed/dp300/proc/slug/v3.pdf','application/pdf',v_snr_ora),
    (v_p_approved,'evidence','Slug_Catcher_Startup_Approved.pdf','seed/dp300/proc/slug/approved.pdf','application/pdf',v_snr_ora);

  INSERT INTO public.p2a_vcr_procedure_activity_log(procedure_id,user_id,action,comment,from_status,to_status,created_at) VALUES
    (v_p_approved,v_snr_ora,   'Started draft','Cold-start line-up drafted from vendor package.','NOT_STARTED','DRAFT', now()-interval '25 days'),
    (v_p_approved,v_snr_ora,   'Submitted for review','v3 circulated to Process + PACO TA2.','DRAFT','UNDER_REVIEW', now()-interval '18 days'),
    (v_p_approved,v_process_ta,'Rejected procedure','Warm-up rate too aggressive; align with vendor curve section 4.3.','UNDER_REVIEW','UNDER_REVIEW', now()-interval '14 days'),
    (v_p_approved,v_snr_ora,   'Resubmitted for review','Warm-up ramp corrected to vendor 4.3; second cross-check added.','REWORK_REQUESTED','UNDER_REVIEW', now()-interval '10 days'),
    (v_p_approved,v_process_ta,'Approved procedure','Line-up and warm-up ramps aligned with vendor package. Records accepted.','UNDER_REVIEW','UNDER_REVIEW', now()-interval '5 days'),
    (v_p_approved,v_paco_ta,   'Approved procedure','ESD interlocks and permissives correctly referenced. Approved.','UNDER_REVIEW','APPROVED', now()-interval '4 days');

  INSERT INTO public.p2a_vcr_procedure_approvers(procedure_id, user_id, role_label, decision, comment, decided_at) VALUES
    (v_p_review, v_process_ta,'Process TA2 – Project','APPROVED','Reboiler warm-up section is clear and correct.', now()-interval '1 days'),
    (v_p_review, v_paco_ta,   'PACO TA2 – Project',    NULL, NULL, NULL);

  INSERT INTO public.p2a_vcr_procedure_attachments(procedure_id, kind, file_name, file_url, mime_type, uploaded_by) VALUES
    (v_p_review,'draft','TEG_Regen_Startup_v1.pdf','seed/dp300/proc/teg/v1.pdf','application/pdf',v_snr_ora);

  INSERT INTO public.p2a_vcr_procedure_activity_log(procedure_id,user_id,action,comment,from_status,to_status,created_at) VALUES
    (v_p_review,v_snr_ora,   'Started draft',NULL,'NOT_STARTED','DRAFT', now()-interval '9 days'),
    (v_p_review,v_snr_ora,   'Submitted for review','v1 shared with Process + PACO TA2.','DRAFT','UNDER_REVIEW', now()-interval '3 days'),
    (v_p_review,v_process_ta,'Approved procedure','Reboiler warm-up section is clear and correct.','UNDER_REVIEW','UNDER_REVIEW', now()-interval '1 days');

  INSERT INTO public.p2a_vcr_procedure_attachments(procedure_id, kind, file_name, file_url, mime_type, uploaded_by) VALUES
    (v_p_draft,'draft','Closed_Drain_Operating_v1_DRAFT.pdf','seed/dp300/proc/drain/v1-draft.pdf','application/pdf',v_snr_ora);
  INSERT INTO public.p2a_vcr_procedure_activity_log(procedure_id,user_id,action,comment,from_status,to_status,created_at) VALUES
    (v_p_draft,v_snr_ora,'Started draft','Update to existing operating procedure — reflect new drum instrumentation.','NOT_STARTED','DRAFT', now()-interval '2 days');

  INSERT INTO public.p2a_vcr_procedure_approvers(procedure_id, user_id, role_label, decision, comment, decided_at) VALUES
    (v_p_rework, v_paco_ta, 'PACO TA2 – Project','REJECTED','Pilot ignition sequence must reference the updated ESD-2 interlock matrix; return for revision.', now()-interval '1 days'),
    (v_p_rework, v_elect_ta,'Elect TA2 – Project', NULL, NULL, NULL);

  INSERT INTO public.p2a_vcr_procedure_attachments(procedure_id, kind, file_name, file_url, mime_type, uploaded_by) VALUES
    (v_p_rework,'draft','Flare_Light_Off_v1.pdf','seed/dp300/proc/flare/v1.pdf','application/pdf',v_snr_ora),
    (v_p_rework,'markup','Flare_Light_Off_v1_PACO_markup.pdf','seed/dp300/proc/flare/v1-paco-markup.pdf','application/pdf',v_paco_ta);

  INSERT INTO public.p2a_vcr_procedure_activity_log(procedure_id,user_id,action,comment,from_status,to_status,created_at) VALUES
    (v_p_rework,v_snr_ora,'Started draft',NULL,'NOT_STARTED','DRAFT', now()-interval '6 days'),
    (v_p_rework,v_snr_ora,'Submitted for review','v1 circulated to PACO + Elect TA2.','DRAFT','UNDER_REVIEW', now()-interval '3 days'),
    (v_p_rework,v_paco_ta,'Rejected procedure','Pilot ignition sequence must reference the updated ESD-2 interlock matrix; return for revision.','UNDER_REVIEW','REWORK_REQUESTED', now()-interval '1 days');

  PERFORM public._procedure_create_owner_task(v_p_ns,     'NOT_STARTED',      v_project, v_project_code, v_vcr_code, v_hp, (SELECT title FROM public.p2a_vcr_procedures WHERE id=v_p_ns),     v_tenant);
  PERFORM public._procedure_create_owner_task(v_p_draft,  'DRAFT',            v_project, v_project_code, v_vcr_code, v_hp, (SELECT title FROM public.p2a_vcr_procedures WHERE id=v_p_draft),  v_tenant);
  PERFORM public._procedure_create_owner_task(v_p_rework, 'REWORK_REQUESTED', v_project, v_project_code, v_vcr_code, v_hp, (SELECT title FROM public.p2a_vcr_procedures WHERE id=v_p_rework), v_tenant);
  PERFORM public._procedure_create_reviewer_tasks(v_p_review, v_project, v_project_code, v_vcr_code, v_hp, (SELECT title FROM public.p2a_vcr_procedures WHERE id=v_p_review), v_tenant);
END $$;
