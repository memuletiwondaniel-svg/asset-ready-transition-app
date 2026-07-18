ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_source_plan_table_check;
ALTER TABLE public.user_tasks
  ADD CONSTRAINT user_tasks_source_plan_table_check
  CHECK (source_plan_table IS NULL OR source_plan_table = ANY (ARRAY[
    'orp_plans','p2a_handover_plans','p2a_handover_points',
    'p2a_vcr_training','p2a_vcr_procedures',
    'p2a_vcr_operational_registers','p2a_vcr_maintenance_deliverables'
  ]));

ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_type_check;
ALTER TABLE public.user_tasks
  ADD CONSTRAINT user_tasks_type_check
  CHECK (type = ANY (ARRAY[
    'approval','task','update','review',
    'vcr_checklist_bundle','vcr_approval_bundle',
    'pssr_checklist_bundle','pssr_approval_bundle',
    'ora_plan_review','ora_activity','vcr_delivery_plan','ora_plan_creation',
    'vcr_plan_resubmit','vcr_interdisciplinary_summary',
    'qualification_review','wh_delivery_bundle','wh_review',
    'training_action','training_review',
    'procedure_action','procedure_review',
    'register_action','register_review',
    'maintenance_action','maintenance_review'
  ]));

CREATE OR REPLACE FUNCTION public._register_upsert_task(
  p_user_id uuid, p_register_id uuid, p_status p2a_register_workflow_status,
  p_task_type text, p_title text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_dedupe text;
BEGIN
  v_dedupe := 'register:'||p_register_id||':'||p_status||':'||p_user_id;
  INSERT INTO public.user_tasks (user_id, title, type, status, priority, dedupe_key, source_plan_table, source_plan_id, metadata)
  VALUES (p_user_id, p_title, p_task_type, 'pending', 'Medium', v_dedupe,
          'p2a_vcr_operational_registers', p_register_id,
          jsonb_build_object('register_id', p_register_id, 'status', p_status::text))
  ON CONFLICT (dedupe_key) WHERE (dedupe_key IS NOT NULL) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public._register_close_tasks(
  p_register_id uuid, p_user_id uuid DEFAULT NULL,
  p_types text[] DEFAULT ARRAY['register_action','register_review']
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.user_tasks SET status='cancelled_superseded', updated_at=now()
   WHERE source_plan_table='p2a_vcr_operational_registers'
     AND source_plan_id=p_register_id AND type=ANY(p_types)
     AND status IN ('pending','in_progress','waiting')
     AND (p_user_id IS NULL OR user_id=p_user_id);
$$;

UPDATE public.qaqc_checks
   SET sql = $Q$WITH need AS (
     SELECT r.id, r.workflow_status,
            CASE WHEN r.workflow_status='UNDER_REVIEW' THEN 'register_review' ELSE 'register_action' END AS ttype
       FROM public.p2a_vcr_operational_registers r
      WHERE r.workflow_status IN ('NOT_STARTED','DRAFT','UNDER_REVIEW','REWORK_REQUESTED')
   ), agg AS (
     SELECT n.id, n.workflow_status, n.ttype, count(t.*) AS open_tasks
       FROM need n LEFT JOIN public.user_tasks t
         ON t.source_plan_table='p2a_vcr_operational_registers' AND t.source_plan_id=n.id
        AND t.type=n.ttype AND t.status='pending'
      GROUP BY 1,2,3
   ) SELECT id, workflow_status::text, ttype, open_tasks FROM agg
     WHERE (ttype='register_action' AND open_tasks<>1) OR (ttype='register_review' AND open_tasks<1)$Q$
 WHERE id='R2_register_owner_task';

DO $$
DECLARE
  v_owner_uid uuid := '0c8134fd-7bde-491c-be5a-96b3a63c048c';
  v_owner_profile uuid;
  rec RECORD;
BEGIN
  SELECT id INTO v_owner_profile FROM public.profiles WHERE user_id=v_owner_uid;
  UPDATE public.p2a_vcr_operational_registers
     SET draft_owner_id = v_owner_profile, updated_at = now()
   WHERE draft_owner_id IS NULL
     AND workflow_status IN ('NOT_STARTED','DRAFT','UNDER_REVIEW','REWORK_REQUESTED');

  FOR rec IN
    SELECT ro.id AS rid, ro.title AS rtitle, ro.workflow_status AS rstatus
      FROM public.p2a_vcr_operational_registers ro
     WHERE ro.workflow_status IN ('NOT_STARTED','DRAFT','REWORK_REQUESTED')
  LOOP
    PERFORM public._register_upsert_task(
      v_owner_uid, rec.rid, rec.rstatus, 'register_action',
      CASE rec.rstatus::text
        WHEN 'NOT_STARTED' THEN 'Start draft: '||rec.rtitle
        WHEN 'DRAFT' THEN 'Continue draft: '||rec.rtitle
        ELSE 'Rework: '||rec.rtitle
      END
    );
  END LOOP;

  FOR rec IN
    SELECT ro.id AS rid, ro.title AS rtitle, rv.reviewer_id AS revid
      FROM public.p2a_vcr_operational_registers ro
      JOIN public.p2a_vcr_register_reviewers rv ON rv.register_id=ro.id
     WHERE ro.workflow_status='UNDER_REVIEW' AND rv.decision='pending'
  LOOP
    PERFORM public._register_upsert_task(
      rec.revid, rec.rid, 'UNDER_REVIEW'::p2a_register_workflow_status, 'register_review',
      'Review: '||rec.rtitle
    );
  END LOOP;
END $$;