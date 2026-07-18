
CREATE OR REPLACE FUNCTION public._task_close_by_dedupe_prefix(p_prefix text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_tasks
     SET status = 'cancelled_superseded', updated_at = now()
   WHERE dedupe_key LIKE p_prefix || '%'
     AND status IN ('pending','in_progress','waiting');
$$;

CREATE OR REPLACE FUNCTION public._prereq_qualification_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project_id uuid; v_role_ids uuid[]; v_role_id uuid;
  v_role_label text; v_user_id uuid; v_dedupe text;
BEGIN
  IF NEW.status = 'QUALIFICATION_REQUESTED'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT hp_plan.project_id INTO v_project_id
      FROM public.p2a_handover_points hp
      JOIN public.p2a_handover_plans hp_plan ON hp_plan.id = hp.handover_plan_id
     WHERE hp.id = NEW.handover_point_id;
    IF NEW.vcr_item_id IS NOT NULL AND v_project_id IS NOT NULL THEN
      SELECT approving_party_role_ids INTO v_role_ids
        FROM public.vcr_items WHERE id = NEW.vcr_item_id;
      IF v_role_ids IS NOT NULL THEN
        FOREACH v_role_id IN ARRAY v_role_ids LOOP
          SELECT name INTO v_role_label FROM public.roles WHERE id = v_role_id;
          IF v_role_label IS NULL THEN CONTINUE; END IF;
          FOR v_user_id IN SELECT public.resolve_project_role_users(v_project_id, v_role_label) LOOP
            IF v_user_id IS NULL THEN CONTINUE; END IF;
            v_dedupe := 'qualification:'||NEW.id::text||':'||v_user_id::text;
            INSERT INTO public.user_tasks
              (user_id, title, type, status, priority, dedupe_key,
               source_plan_table, source_plan_id, metadata)
            VALUES
              (v_user_id, 'Review qualification for prerequisite',
               'qualification_review', 'pending', 'High', v_dedupe,
               'p2a_vcr_prerequisites', NEW.id,
               jsonb_build_object('action','review_qualification',
                 'prerequisite_id', NEW.id, 'vcr_item_id', NEW.vcr_item_id,
                 'handover_point_id', NEW.handover_point_id,
                 'project_id', v_project_id,
                 'role_id', v_role_id, 'role_label', v_role_label))
            ON CONFLICT (dedupe_key) WHERE (dedupe_key IS NOT NULL) DO NOTHING;
          END LOOP;
        END LOOP;
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'QUALIFICATION_REQUESTED'
     AND NEW.status IS DISTINCT FROM 'QUALIFICATION_REQUESTED' THEN
    PERFORM public._task_close_by_dedupe_prefix('qualification:'||NEW.id::text||':');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_prereq_qualification_fanout ON public.p2a_vcr_prerequisites;
CREATE TRIGGER trg_prereq_qualification_fanout
AFTER INSERT OR UPDATE OF status ON public.p2a_vcr_prerequisites
FOR EACH ROW EXECUTE FUNCTION public._prereq_qualification_fanout();

CREATE OR REPLACE FUNCTION public._vcr_plan_approver_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dedupe text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status = 'PENDING'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    v_dedupe := 'vcr_plan_review:'||NEW.id::text;
    INSERT INTO public.user_tasks
      (user_id, title, type, status, priority, dedupe_key,
       source_plan_table, source_plan_id, metadata)
    VALUES
      (NEW.user_id, 'Review VCR plan', 'review', 'pending', 'High',
       v_dedupe, 'vcr_plan_approvers', NEW.id,
       jsonb_build_object('action','review_vcr_plan',
         'approver_id', NEW.id,
         'handover_point_id', NEW.handover_point_id,
         'role_key', NEW.role_key, 'role_label', NEW.role_label))
    ON CONFLICT (dedupe_key) WHERE (dedupe_key IS NOT NULL) DO NOTHING;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'PENDING'
     AND NEW.status IS DISTINCT FROM 'PENDING' THEN
    PERFORM public._task_close_by_dedupe_prefix('vcr_plan_review:'||NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_vcr_plan_approver_fanout ON public.vcr_plan_approvers;
CREATE TRIGGER trg_vcr_plan_approver_fanout
AFTER INSERT OR UPDATE OF status ON public.vcr_plan_approvers
FOR EACH ROW EXECUTE FUNCTION public._vcr_plan_approver_fanout();

CREATE OR REPLACE FUNCTION public._sof_approver_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dedupe text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status = 'PENDING'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    v_dedupe := 'sof_sign:'||NEW.id::text;
    INSERT INTO public.user_tasks
      (user_id, title, type, status, priority, dedupe_key,
       source_plan_table, source_plan_id, metadata)
    VALUES
      (NEW.user_id, 'Sign SoF certificate', 'sof_sign', 'pending', 'High',
       v_dedupe, 'sof_approvers', NEW.id,
       jsonb_build_object('action','sign_sof', 'approver_id', NEW.id,
         'sof_certificate_id', NEW.sof_certificate_id,
         'approver_role', NEW.approver_role))
    ON CONFLICT (dedupe_key) WHERE (dedupe_key IS NOT NULL) DO NOTHING;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'PENDING'
     AND NEW.status IS DISTINCT FROM 'PENDING' THEN
    PERFORM public._task_close_by_dedupe_prefix('sof_sign:'||NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sof_approver_fanout ON public.sof_approvers;
CREATE TRIGGER trg_sof_approver_fanout
AFTER INSERT OR UPDATE OF status ON public.sof_approvers
FOR EACH ROW EXECUTE FUNCTION public._sof_approver_fanout();

CREATE OR REPLACE FUNCTION public._pac_approver_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dedupe text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status = 'PENDING'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    v_dedupe := 'pac_sign:'||NEW.id::text;
    INSERT INTO public.user_tasks
      (user_id, title, type, status, priority, dedupe_key,
       source_plan_table, source_plan_id, metadata)
    VALUES
      (NEW.user_id, 'Sign PAC certificate', 'pac_sign', 'pending', 'High',
       v_dedupe, 'vcr_pac_approvers', NEW.id,
       jsonb_build_object('action','sign_pac', 'approver_id', NEW.id,
         'handover_point_id', NEW.handover_point_id,
         'approver_role', NEW.approver_role))
    ON CONFLICT (dedupe_key) WHERE (dedupe_key IS NOT NULL) DO NOTHING;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'PENDING'
     AND NEW.status IS DISTINCT FROM 'PENDING' THEN
    PERFORM public._task_close_by_dedupe_prefix('pac_sign:'||NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_pac_approver_fanout ON public.vcr_pac_approvers;
CREATE TRIGGER trg_pac_approver_fanout
AFTER INSERT OR UPDATE OF status ON public.vcr_pac_approvers
FOR EACH ROW EXECUTE FUNCTION public._pac_approver_fanout();

INSERT INTO public.qaqc_checks (id, category, title, description, sql, severity, is_active)
VALUES
(gen_random_uuid(),'task','T7_qualification_requested_has_open_review_task',
 'Every prereq in QUALIFICATION_REQUESTED must have >=1 open qualification_review task.',
 $q$SELECT p.id FROM public.p2a_vcr_prerequisites p
    WHERE p.status='QUALIFICATION_REQUESTED'
      AND NOT EXISTS (SELECT 1 FROM public.user_tasks t
        WHERE t.type='qualification_review' AND t.source_plan_id=p.id
          AND t.status IN ('pending','in_progress','waiting'))$q$,'error',true),
(gen_random_uuid(),'task','T8_qualification_review_task_only_when_requested',
 'No open qualification_review task may exist for a prereq not in QUALIFICATION_REQUESTED.',
 $q$SELECT t.id FROM public.user_tasks t
    JOIN public.p2a_vcr_prerequisites p ON p.id=t.source_plan_id
    WHERE t.type='qualification_review'
      AND t.status IN ('pending','in_progress','waiting')
      AND p.status IS DISTINCT FROM 'QUALIFICATION_REQUESTED'$q$,'error',true),
(gen_random_uuid(),'task','T9_vcr_plan_pending_has_open_review_task',
 'Every PENDING vcr_plan_approvers row with a user_id must have an open review task.',
 $q$SELECT a.id FROM public.vcr_plan_approvers a
    WHERE a.status='PENDING' AND a.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.user_tasks t
        WHERE t.type='review' AND (t.metadata->>'action')='review_vcr_plan'
          AND t.source_plan_id=a.id
          AND t.status IN ('pending','in_progress','waiting'))$q$,'error',true),
(gen_random_uuid(),'task','T10_vcr_plan_review_task_only_when_pending',
 'No open review_vcr_plan task may exist for an approver row not in PENDING.',
 $q$SELECT t.id FROM public.user_tasks t
    JOIN public.vcr_plan_approvers a ON a.id=t.source_plan_id
    WHERE t.type='review' AND (t.metadata->>'action')='review_vcr_plan'
      AND t.status IN ('pending','in_progress','waiting')
      AND a.status IS DISTINCT FROM 'PENDING'$q$,'error',true),
(gen_random_uuid(),'task','T11_sof_pending_has_open_sign_task',
 'Every PENDING sof_approvers row with a user_id must have an open sof_sign task.',
 $q$SELECT a.id FROM public.sof_approvers a
    WHERE a.status='PENDING' AND a.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.user_tasks t
        WHERE t.type='sof_sign' AND t.source_plan_id=a.id
          AND t.status IN ('pending','in_progress','waiting'))$q$,'error',true),
(gen_random_uuid(),'task','T12_pac_pending_has_open_sign_task',
 'Every PENDING vcr_pac_approvers row with a user_id must have an open pac_sign task.',
 $q$SELECT a.id FROM public.vcr_pac_approvers a
    WHERE a.status='PENDING' AND a.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.user_tasks t
        WHERE t.type='pac_sign' AND t.source_plan_id=a.id
          AND t.status IN ('pending','in_progress','waiting'))$q$,'error',true);

-- Hydration backfill (idempotent via dedupe_key)
UPDATE public.p2a_vcr_prerequisites SET updated_at=now() WHERE status='QUALIFICATION_REQUESTED';
UPDATE public.vcr_plan_approvers   SET updated_at=now() WHERE status='PENDING' AND user_id IS NOT NULL;
