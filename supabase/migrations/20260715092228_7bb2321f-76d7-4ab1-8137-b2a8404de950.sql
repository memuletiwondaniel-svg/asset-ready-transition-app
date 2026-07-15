
-- ---------- 1) user_tasks.type_check ----------
ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_type_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_type_check
  CHECK (type = ANY (ARRAY[
    'approval','task','update','review',
    'vcr_checklist_bundle','vcr_approval_bundle',
    'pssr_checklist_bundle','pssr_approval_bundle',
    'ora_plan_review','ora_activity','vcr_delivery_plan',
    'ora_plan_creation','vcr_plan_resubmit','vcr_interdisciplinary_summary',
    'qualification_review','wh_delivery_bundle','wh_review'
  ]));

-- ---------- 2) helper ----------
CREATE OR REPLACE FUNCTION public.is_project_snr_ora(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.resolve_project_role_user(_project_id, 'Snr ORA Engr') = _user_id; $$;

-- ---------- 3) Tree B retirement ----------
DROP TRIGGER IF EXISTS trg_create_itp_confirmation_task ON public.user_tasks;

UPDATE public.user_tasks
   SET status = 'cancelled_superseded', updated_at = now()
 WHERE status IN ('pending','in_progress','waiting')
   AND (
     metadata->>'action' IN ('complete_itp','complete_itp_activity','confirm_itp_activity','complete_witness_hold')
     OR metadata->>'action' LIKE 'complete_witness_hold%'
   );

-- ---------- 4) Rewrite create_vcr_deliverable_fanout ----------
CREATE OR REPLACE FUNCTION public.create_vcr_deliverable_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_proj_id uuid; v_proj_code text; v_sr uuid; v_vcr text; v_vcr_name text;
  v_short text; v_display text; v_handover uuid;
  v_parent_id uuid; v_dedupe text; v_sub_dedupe text;
  v_child RECORD; v_idx int;
  v_actions jsonb := jsonb_build_array(
    jsonb_build_object('action','deliver_training',             'title_prefix','Deliver Training',             'detail_table','p2a_vcr_training'),
    jsonb_build_object('action','deliver_procedures',           'title_prefix','Deliver Procedures',           'detail_table','p2a_vcr_procedures'),
    jsonb_build_object('action','deliver_critical_docs',        'title_prefix','Deliver Critical Documents',   'detail_table','p2a_vcr_critical_docs'),
    jsonb_build_object('action','deliver_procedures_registers', 'title_prefix','Deliver Procedures & Registers','detail_table','p2a_vcr_operational_registers')
  );
  v_a jsonb;
  v_dp RECORD; v_bundle_dedupe text; v_items jsonb;
BEGIN
  IF NEW.stage <> 'VCR' OR NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN RETURN NEW; END IF;
  IF NOT public.vcr_plan_is_approved(NEW.point_id) THEN RETURN NEW; END IF;

  SELECT pl.project_id, COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''),
         pt.vcr_code, pt.name, pl.id
    INTO v_proj_id, v_proj_code, v_vcr, v_vcr_name, v_handover
  FROM public.p2a_handover_points pt
    JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
    JOIN public.projects pr ON pr.id = pl.project_id
  WHERE pt.id = NEW.point_id;
  IF v_proj_id IS NULL THEN RETURN NEW; END IF;

  v_short := public.vcr_short_label(v_vcr);
  v_display := v_short || COALESCE(' ('||v_vcr_name||')','');

  v_sr := public.resolve_project_role_user(v_proj_id, 'Snr ORA Engr');
  IF v_sr IS NULL THEN RETURN NEW; END IF;

  FOR v_a IN SELECT jsonb_array_elements(v_actions) LOOP
    v_dedupe := (v_a->>'action')||':'||NEW.point_id::text||':Sr ORA Engr:1';
    IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN CONTINUE; END IF;

    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, progress_percentage)
    VALUES (v_sr,
      (v_a->>'title_prefix')||' for '||v_display,
      (v_a->>'title_prefix')||' for '||v_display,
      'task','pending','High', v_dedupe,
      jsonb_build_object('source','p2a_handover','contract','spec_v2',
        'project_id', v_proj_id,'project_code', v_proj_code,
        'plan_id', v_handover,'point_id', NEW.point_id,
        'vcr_code', v_vcr,'vcr_short_label', v_short,'vcr_name', v_vcr_name,
        'action', (v_a->>'action'),'has_sub_tasks', true,
        'detail_table', (v_a->>'detail_table')),
      0)
    RETURNING id INTO v_parent_id;

    v_idx := 0;
    FOR v_child IN EXECUTE format(
      'SELECT id, title AS row_title FROM public.%I WHERE handover_point_id = $1 ORDER BY display_order, created_at',
      (v_a->>'detail_table')
    ) USING NEW.point_id LOOP
      v_idx := v_idx + 1;
      v_sub_dedupe := (v_a->>'action')||'_sub:'||NEW.point_id::text||':'||v_child.id::text||':1';
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, parent_task_id)
      VALUES (v_sr,
        (v_a->>'title_prefix')||' for '||v_display||' — '||COALESCE(v_child.row_title,'Item '||v_idx::text),
        'Sub-task for '||(v_a->>'title_prefix')||' for '||v_display,
        'task','pending','Medium', v_sub_dedupe,
        jsonb_build_object('source','p2a_handover','contract','spec_v2',
          'project_id', v_proj_id,'project_code', v_proj_code,
          'plan_id', v_handover,'point_id', NEW.point_id,
          'vcr_code', v_vcr,'vcr_short_label', v_short,'vcr_name', v_vcr_name,
          'action', (v_a->>'action')||'_item',
          'detail_table', (v_a->>'detail_table'),
          'detail_row_id', v_child.id,
          'item_index', v_idx),
        v_parent_id);
    END LOOP;
  END LOOP;

  -- W&H aggregate delivery bundles per delivering-party role
  FOR v_dp IN
    SELECT ia.delivering_party_role_id AS role_id, r.name AS role_name,
           public.resolve_project_role_user(v_proj_id, r.name) AS holder
      FROM public.p2a_itp_activities ia
      JOIN public.roles r ON r.id = ia.delivering_party_role_id
     WHERE ia.handover_point_id = NEW.point_id
       AND ia.inspection_type IN ('WITNESS','HOLD')
       AND ia.delivering_party_role_id IS NOT NULL
     GROUP BY ia.delivering_party_role_id, r.name
  LOOP
    IF v_dp.holder IS NULL THEN CONTINUE; END IF;
    v_bundle_dedupe := 'wh_delivery_bundle:'||NEW.point_id::text||':'||v_dp.role_id::text||':1';
    IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_bundle_dedupe) THEN CONTINUE; END IF;

    SELECT jsonb_agg(jsonb_build_object(
             'itp_activity_id', ia.id,
             'title', ia.activity_name,
             'inspection_type', ia.inspection_type,
             'status', ia.status::text,
             'done', (ia.status = 'COMPLETED')
           ) ORDER BY ia.display_order)
      INTO v_items
      FROM public.p2a_itp_activities ia
     WHERE ia.handover_point_id = NEW.point_id
       AND ia.delivering_party_role_id = v_dp.role_id
       AND ia.inspection_type IN ('WITNESS','HOLD');

    INSERT INTO public.user_tasks (
      user_id, title, description, type, status, priority, dedupe_key, metadata,
      progress_percentage, sub_items
    ) VALUES (
      v_dp.holder,
      v_proj_code||': Deliver W&H Points ('||v_dp.role_name||') — '||v_short,
      'Aggregate delivery bundle for Witness & Hold points on '||v_display,
      'wh_delivery_bundle','pending','High',
      v_bundle_dedupe,
      jsonb_build_object('source','p2a_handover','contract','spec_v2',
        'project_id', v_proj_id,'project_code', v_proj_code,
        'plan_id', v_handover,'point_id', NEW.point_id,
        'vcr_code', v_vcr,'vcr_short_label', v_short,'vcr_name', v_vcr_name,
        'action','deliver_witness_hold',
        'delivering_party_role_id', v_dp.role_id,
        'delivering_party_role', v_dp.role_name),
      0, COALESCE(v_items,'[]'::jsonb)
    );
  END LOOP;

  PERFORM public.wh_restamp_bundles_for_point(NEW.point_id);
  RETURN NEW;
END
$function$;

-- ---------- 5) Bundle re-stamp helper ----------
CREATE OR REPLACE FUNCTION public.wh_restamp_bundles_for_point(_point_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_b RECORD; v_items jsonb; v_total int; v_done int; v_pct int;
BEGIN
  FOR v_b IN
    SELECT id, metadata->>'delivering_party_role_id' AS role_id
      FROM public.user_tasks
     WHERE type = 'wh_delivery_bundle'
       AND (metadata->>'point_id')::uuid = _point_id
  LOOP
    SELECT jsonb_agg(jsonb_build_object(
             'itp_activity_id', ia.id,
             'title', ia.activity_name,
             'inspection_type', ia.inspection_type,
             'status', ia.status::text,
             'done', (ia.status = 'COMPLETED')
           ) ORDER BY ia.display_order),
           COUNT(*), COUNT(*) FILTER (WHERE ia.status = 'COMPLETED')
      INTO v_items, v_total, v_done
      FROM public.p2a_itp_activities ia
     WHERE ia.handover_point_id = _point_id
       AND ia.delivering_party_role_id::text = v_b.role_id
       AND ia.inspection_type IN ('WITNESS','HOLD');

    v_pct := CASE WHEN v_total = 0 THEN 0 ELSE ROUND(100.0 * v_done / v_total)::int END;

    UPDATE public.user_tasks
       SET sub_items = COALESCE(v_items,'[]'::jsonb),
           progress_percentage = v_pct,
           status = CASE WHEN v_total > 0 AND v_done = v_total THEN 'completed'
                         WHEN status = 'completed' AND v_done < v_total THEN 'in_progress'
                         WHEN status = 'pending' AND v_done > 0 THEN 'in_progress'
                         ELSE status END,
           updated_at = now()
     WHERE id = v_b.id;
  END LOOP;
END $$;

-- ---------- 6) Review-task fan-out ----------
CREATE OR REPLACE FUNCTION public.wh_fanout_review_tasks(_itp_activity_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ctx RECORD; v_ap RECORD; v_dedupe text; v_short text;
BEGIN
  SELECT ia.activity_name, ia.inspection_type, ia.handover_point_id AS point_id,
         hp.vcr_code, hp.name AS vcr_name, pl.id AS plan_id, pl.project_id,
         COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,'') AS proj_code
    INTO v_ctx
    FROM public.p2a_itp_activities ia
    JOIN public.p2a_handover_points hp ON hp.id = ia.handover_point_id
    JOIN public.p2a_handover_plans pl ON pl.id = hp.handover_plan_id
    JOIN public.projects pr ON pr.id = pl.project_id
   WHERE ia.id = _itp_activity_id;
  IF v_ctx IS NULL THEN RETURN; END IF;

  v_short := public.vcr_short_label(v_ctx.vcr_code);

  FOR v_ap IN
    SELECT user_id FROM public.p2a_itp_accepting_parties
     WHERE itp_activity_id = _itp_activity_id AND status = 'PENDING'
  LOOP
    v_dedupe := 'wh_review:'||_itp_activity_id::text||':'||v_ap.user_id::text;
    IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe AND status IN ('pending','in_progress','waiting')) THEN CONTINUE; END IF;

    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata)
    VALUES (v_ap.user_id,
      v_ctx.proj_code||': Review '||CASE WHEN v_ctx.inspection_type='HOLD' THEN 'Hold' ELSE 'Witness' END||' Point — '||v_ctx.activity_name,
      'Review and decide on witness/hold submission for '||v_short,
      'wh_review','pending','High', v_dedupe,
      jsonb_build_object('source','p2a_handover','contract','spec_v2',
        'project_id', v_ctx.project_id,'project_code', v_ctx.proj_code,
        'plan_id', v_ctx.plan_id,'point_id', v_ctx.point_id,
        'vcr_code', v_ctx.vcr_code,'vcr_short_label', v_short,
        'action','review_witness_hold',
        'itp_activity_id', _itp_activity_id));
  END LOOP;
END $$;

-- ---------- 7) State machine ----------
CREATE OR REPLACE FUNCTION public.trg_wh_activity_state_machine()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'SCHEDULED' AND (OLD.status IS DISTINCT FROM 'SCHEDULED') THEN
    IF NEW.scheduled_at IS NULL THEN NEW.scheduled_at := now(); END IF;
  END IF;
  IF NEW.status = 'UNDER_REVIEW' AND (OLD.status IS DISTINCT FROM 'UNDER_REVIEW') THEN
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
    IF OLD.status = 'REWORK_REQUESTED' THEN
      UPDATE public.p2a_itp_accepting_parties
         SET status='PENDING', comment=NULL, decided_at=NULL, updated_at=now()
       WHERE itp_activity_id = NEW.id;
    END IF;
  END IF;
  IF NEW.status = 'COMPLETED' AND OLD.status IS DISTINCT FROM 'COMPLETED' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wh_activity_state_machine ON public.p2a_itp_activities;
CREATE TRIGGER trg_wh_activity_state_machine
  BEFORE UPDATE OF status ON public.p2a_itp_activities
  FOR EACH ROW EXECUTE FUNCTION public.trg_wh_activity_state_machine();

CREATE OR REPLACE FUNCTION public.trg_wh_activity_after_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'UNDER_REVIEW' AND OLD.status IS DISTINCT FROM 'UNDER_REVIEW' THEN
    PERFORM public.wh_fanout_review_tasks(NEW.id);
    INSERT INTO public.p2a_itp_activity_log(itp_activity_id, user_id, action)
      VALUES (NEW.id, auth.uid(), 'submitted');
  END IF;
  IF NEW.status = 'SCHEDULED' AND OLD.status IS DISTINCT FROM 'SCHEDULED' THEN
    INSERT INTO public.p2a_itp_activity_log(itp_activity_id, user_id, action)
      VALUES (NEW.id, auth.uid(), 'scheduled');
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.wh_restamp_bundles_for_point(NEW.handover_point_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wh_activity_after_status ON public.p2a_itp_activities;
CREATE TRIGGER trg_wh_activity_after_status
  AFTER UPDATE OF status ON public.p2a_itp_activities
  FOR EACH ROW EXECUTE FUNCTION public.trg_wh_activity_after_status();

-- ---------- 8) Accepting-party cascade ----------
CREATE OR REPLACE FUNCTION public.trg_wh_accepting_cascade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status IN ('APPROVED','REJECTED') THEN
    NEW.decided_at := COALESCE(NEW.decided_at, now());
    INSERT INTO public.p2a_itp_activity_log(itp_activity_id, user_id, action, comment)
      VALUES (NEW.itp_activity_id, NEW.user_id,
              CASE WHEN NEW.status='APPROVED' THEN 'approved' ELSE 'rejected' END, NEW.comment);
    UPDATE public.user_tasks
       SET status='completed', updated_at=now()
     WHERE dedupe_key = 'wh_review:'||NEW.itp_activity_id::text||':'||NEW.user_id::text
       AND status IN ('pending','in_progress','waiting');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wh_accepting_before ON public.p2a_itp_accepting_parties;
CREATE TRIGGER trg_wh_accepting_before
  BEFORE UPDATE OF status ON public.p2a_itp_accepting_parties
  FOR EACH ROW EXECUTE FUNCTION public.trg_wh_accepting_cascade();

CREATE OR REPLACE FUNCTION public.trg_wh_accepting_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total int; v_approved int; v_rejected int;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status='APPROVED'), COUNT(*) FILTER (WHERE status='REJECTED')
    INTO v_total, v_approved, v_rejected
    FROM public.p2a_itp_accepting_parties
   WHERE itp_activity_id = NEW.itp_activity_id;
  IF v_rejected > 0 THEN
    UPDATE public.p2a_itp_activities
       SET status='REWORK_REQUESTED', updated_at=now()
     WHERE id = NEW.itp_activity_id AND status <> 'REWORK_REQUESTED';
  ELSIF v_total > 0 AND v_approved = v_total THEN
    UPDATE public.p2a_itp_activities
       SET status='COMPLETED', completed_at=COALESCE(completed_at, now()), updated_at=now()
     WHERE id = NEW.itp_activity_id AND status <> 'COMPLETED';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wh_accepting_after ON public.p2a_itp_accepting_parties;
CREATE TRIGGER trg_wh_accepting_after
  AFTER UPDATE OF status ON public.p2a_itp_accepting_parties
  FOR EACH ROW EXECUTE FUNCTION public.trg_wh_accepting_after();

-- ---------- 9) RLS tightening ----------
DROP POLICY IF EXISTS "itp_activity_update_gated" ON public.p2a_itp_activities;
CREATE POLICY "itp_activity_update_gated"
  ON public.p2a_itp_activities FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.p2a_handover_points hp
      JOIN public.p2a_handover_plans pl ON pl.id = hp.handover_plan_id
      WHERE hp.id = p2a_itp_activities.handover_point_id
        AND (
          public.is_project_snr_ora(pl.project_id, auth.uid())
          OR public.resolve_project_role_user(pl.project_id,
                (SELECT name FROM public.roles WHERE id = p2a_itp_activities.delivering_party_role_id)) = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.p2a_itp_accepting_parties ap
       WHERE ap.itp_activity_id = p2a_itp_activities.id AND ap.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "itp_accepting_write_service" ON public.p2a_itp_accepting_parties;
CREATE POLICY "itp_accepting_insert_snr_ora"
  ON public.p2a_itp_accepting_parties FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.p2a_itp_activities ia
      JOIN public.p2a_handover_points hp ON hp.id = ia.handover_point_id
      JOIN public.p2a_handover_plans pl ON pl.id = hp.handover_plan_id
      WHERE ia.id = p2a_itp_accepting_parties.itp_activity_id
        AND public.is_project_snr_ora(pl.project_id, auth.uid())
    )
  );
CREATE POLICY "itp_accepting_delete_snr_ora"
  ON public.p2a_itp_accepting_parties FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.p2a_itp_activities ia
      JOIN public.p2a_handover_points hp ON hp.id = ia.handover_point_id
      JOIN public.p2a_handover_plans pl ON pl.id = hp.handover_plan_id
      WHERE ia.id = p2a_itp_accepting_parties.itp_activity_id
        AND public.is_project_snr_ora(pl.project_id, auth.uid())
    )
  );
CREATE POLICY "itp_accepting_decide_own_pending"
  ON public.p2a_itp_accepting_parties FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "itp_accepting_service_write"
  ON public.p2a_itp_accepting_parties FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------- 10) QAQC W1 ----------
INSERT INTO public.qaqc_checks (id, category, title, severity, sql, is_active)
VALUES (
  'W1', 'W_family',
  'Every non-Not-Started W&H point has delivering + >=1 accepting party; UNDER_REVIEW has pending review row + task; no JSON in notes',
  'error',
  $Q$
  WITH bad_parties AS (
    SELECT ia.id::text AS sample FROM public.p2a_itp_activities ia
     WHERE ia.inspection_type IN ('WITNESS','HOLD') AND ia.status <> 'NOT_STARTED'
       AND (ia.delivering_party_role_id IS NULL
            OR NOT EXISTS (SELECT 1 FROM public.p2a_itp_accepting_parties ap WHERE ap.itp_activity_id = ia.id))
  ),
  bad_review AS (
    SELECT ia.id::text AS sample FROM public.p2a_itp_activities ia
     WHERE ia.status = 'UNDER_REVIEW'
       AND (NOT EXISTS (SELECT 1 FROM public.p2a_itp_accepting_parties ap WHERE ap.itp_activity_id = ia.id AND ap.status='PENDING')
            OR NOT EXISTS (SELECT 1 FROM public.user_tasks t
                            WHERE t.type='wh_review'
                              AND (t.metadata->>'itp_activity_id')::uuid = ia.id
                              AND t.status IN ('pending','in_progress','waiting')))
  ),
  json_notes AS (
    SELECT ia.id::text AS sample FROM public.p2a_itp_activities ia
     WHERE ia.notes IS NOT NULL AND btrim(ia.notes) LIKE '{%'
  )
  SELECT sample FROM bad_parties UNION ALL SELECT sample FROM bad_review UNION ALL SELECT sample FROM json_notes
  $Q$,
  true
) ON CONFLICT (id) DO NOTHING;

-- ---------- 11) Seeds ----------
DO $seed$
DECLARE
  v_point uuid := '96b44257-5c3b-4ec8-be04-1ada2d792257';
  v_project uuid := '76901c6c-927d-4266-aaea-bc036888f274';
  v_proj_code text;
  v_vcr text := 'VCR-DP300-02';
  v_comm uuid := '3a4faa89-093a-4116-97ff-a08d14ee6a48';
  v_constr uuid := 'b0d37e55-883a-4812-849d-ac7123f66f9d';
  v_sr uuid := '49d052ff-e30f-4b1f-b10b-7edeb83db97e';
  v_ora uuid := '0c8134fd-7bde-491c-be5a-96b3a63c048c';
  v_comm_r uuid := 'd88df696-db5f-4952-b685-1b907b472dcb';
  v_constr_r uuid := '82b98733-1690-4d04-b2bb-e9c24ec18325';
  v_sr_r uuid := 'c98aedd9-db4c-4322-b15e-824c86744acc';
  v_ora_r uuid := '11d4cc74-146e-48d5-9a98-922dbf8c08f0';
  v_row1 uuid := 'ff80c03b-66da-46ce-b418-f41a21cf4df5';
  v_row2 uuid := 'bee92bf8-c6f2-4ba3-871d-8eecc6d03290';
  v_row3 uuid := '8e279e7f-c0bb-4041-b9bc-b26658179815';
  v_row4 uuid := '91812cfe-42d4-4740-8909-91f4e0476430';
  v_row5 uuid := '67f6442e-cce3-4392-b87c-bbac05af7156';
  v_row6 uuid := 'a58bfc93-71ab-464f-95c8-ee124d5a4e3a';
BEGIN
  SELECT COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,'')
    INTO v_proj_code FROM public.projects pr WHERE pr.id = v_project;

  -- Suppress state-machine side effects during seed (we set final states directly)
  ALTER TABLE public.p2a_itp_activities DISABLE TRIGGER trg_wh_activity_state_machine;
  ALTER TABLE public.p2a_itp_activities DISABLE TRIGGER trg_wh_activity_after_status;

  UPDATE public.p2a_itp_activities SET inspection_type='HOLD',    delivering_party_role_id = v_comm_r,   scheduled_at = now() + interval '3 days', location='OSBL piping deck B', notes='Hydrotest to 1.5× design pressure per procedure DP300-HT-01', status='SCHEDULED' WHERE id = v_row1;
  UPDATE public.p2a_itp_activities SET inspection_type='WITNESS', delivering_party_role_id = v_comm_r,   scheduled_at = now() - interval '10 days', submitted_at = now() - interval '9 days', completed_at = now() - interval '8 days', outcome_summary='Pigging launcher SAT signed off — no leaks, torque records archived.', status='COMPLETED', notes='SAT witnessed by Sr ORA and ORA Lead.' WHERE id = v_row2;
  UPDATE public.p2a_itp_activities SET inspection_type='WITNESS', delivering_party_role_id = v_comm_r,   scheduled_at = NULL, notes='Awaits panel FAT close-out before scheduling.', status='NOT_STARTED' WHERE id = v_row3;
  UPDATE public.p2a_itp_activities SET inspection_type='HOLD',    delivering_party_role_id = v_comm_r,   scheduled_at = now() - interval '6 days', submitted_at = now() - interval '5 days', completed_at = now() - interval '4 days', outcome_summary='All 12 PSVs popped within tolerance; cert numbers logged in register.', status='COMPLETED', notes='PSV pop-test batch — pop pressure records attached.' WHERE id = v_row4;
  UPDATE public.p2a_itp_activities SET inspection_type='WITNESS', delivering_party_role_id = v_constr_r, scheduled_at = now() - interval '4 days', submitted_at = now() - interval '1 day', outcome_summary='HV cable megger + continuity passed; results uploaded for ORA review.', status='UNDER_REVIEW', notes='Awaiting witness sign-off.' WHERE id = v_row5;
  UPDATE public.p2a_itp_activities SET inspection_type='HOLD',    delivering_party_role_id = v_comm_r,   scheduled_at = now() - interval '3 days', submitted_at = now() - interval '2 days', outcome_summary='N2 purge attempted — O2 residual above threshold. Re-attempt required.', status='REWORK_REQUESTED', notes='Rework requested by Sr ORA — see comment.' WHERE id = v_row6;

  ALTER TABLE public.p2a_itp_activities ENABLE TRIGGER trg_wh_activity_state_machine;
  ALTER TABLE public.p2a_itp_activities ENABLE TRIGGER trg_wh_activity_after_status;

  INSERT INTO public.p2a_itp_accepting_parties(itp_activity_id, role_id, user_id, status, comment, decided_at) VALUES
    (v_row1, v_sr_r,  v_sr,  'PENDING',  NULL, NULL),
    (v_row1, v_ora_r, v_ora, 'PENDING',  NULL, NULL),
    (v_row2, v_sr_r,  v_sr,  'APPROVED', 'Cleared — pigging OK.', now() - interval '8 days'),
    (v_row2, v_ora_r, v_ora, 'APPROVED', 'Approved.',              now() - interval '8 days'),
    (v_row3, v_sr_r,  v_sr,  'PENDING',  NULL, NULL),
    (v_row3, v_ora_r, v_ora, 'PENDING',  NULL, NULL),
    (v_row4, v_sr_r,  v_sr,  'APPROVED', 'PSV batch accepted.',    now() - interval '4 days'),
    (v_row4, v_ora_r, v_ora, 'APPROVED', 'OK.',                    now() - interval '4 days'),
    (v_row5, v_sr_r,  v_sr,  'PENDING',  NULL, NULL),
    (v_row5, v_ora_r, v_ora, 'PENDING',  NULL, NULL),
    (v_row6, v_sr_r,  v_sr,  'REJECTED', 'O2 residual above 1%. Purge again and resubmit.', now() - interval '1 day'),
    (v_row6, v_ora_r, v_ora, 'PENDING',  NULL, NULL)
  ON CONFLICT (itp_activity_id, user_id) DO NOTHING;

  INSERT INTO public.p2a_itp_attachments(itp_activity_id, kind, file_path, file_name, uploaded_by) VALUES
    (v_row2, 'evidence', 'p2a-attachments/seed/dp300-02/pigging-sat.pdf',  'Pigging_SAT_signoff.pdf',  v_comm),
    (v_row4, 'evidence', 'p2a-attachments/seed/dp300-02/psv-poptest.pdf',  'PSV_PopTest_batch.pdf',    v_comm),
    (v_row5, 'evidence', 'p2a-attachments/seed/dp300-02/hv-megger.pdf',    'HV_cable_megger.pdf',      v_constr),
    (v_row6, 'evidence', 'p2a-attachments/seed/dp300-02/n2-purge-log.pdf', 'N2_purge_attempt1.pdf',    v_comm)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.p2a_itp_activity_log(itp_activity_id, user_id, action, comment, created_at) VALUES
    (v_row1, v_comm, 'scheduled', 'Scheduled with piping crew.', now() - interval '1 day'),
    (v_row2, v_comm, 'scheduled', 'Witness slot booked.',        now() - interval '10 days'),
    (v_row2, v_comm, 'submitted', 'Records attached.',           now() - interval '9 days'),
    (v_row2, v_sr,   'approved',  'Cleared — pigging OK.',       now() - interval '8 days'),
    (v_row2, v_ora,  'approved',  'Approved.',                   now() - interval '8 days'),
    (v_row4, v_comm, 'scheduled', 'PSV batch slot.',             now() - interval '6 days'),
    (v_row4, v_comm, 'submitted', 'Pop records uploaded.',       now() - interval '5 days'),
    (v_row4, v_sr,   'approved',  'PSV batch accepted.',         now() - interval '4 days'),
    (v_row4, v_ora,  'approved',  'OK.',                         now() - interval '4 days'),
    (v_row5, v_constr,'scheduled','Megger walkdown.',            now() - interval '4 days'),
    (v_row5, v_constr,'submitted','Results uploaded.',           now() - interval '1 day'),
    (v_row6, v_comm, 'scheduled', 'Purge attempt scheduled.',    now() - interval '3 days'),
    (v_row6, v_comm, 'submitted', 'Purge complete — logs attached.', now() - interval '2 days'),
    (v_row6, v_sr,   'rejected',  'O2 residual above 1%. Purge again and resubmit.', now() - interval '1 day');

  INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, sub_items, progress_percentage)
  SELECT v_comm,
         v_proj_code||': Deliver W&H Points (Commissioning Lead) — '||v_vcr,
         'Aggregate delivery bundle for Witness & Hold points',
         'wh_delivery_bundle','pending','High',
         'wh_delivery_bundle:'||v_point::text||':'||v_comm_r::text||':1',
         jsonb_build_object('source','p2a_handover','project_id',v_project,'project_code',v_proj_code,
                            'point_id',v_point,'vcr_code',v_vcr,'vcr_short_label',public.vcr_short_label(v_vcr),
                            'action','deliver_witness_hold',
                            'delivering_party_role_id', v_comm_r,'delivering_party_role','Commissioning Lead'),
         '[]'::jsonb, 0
   WHERE NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = 'wh_delivery_bundle:'||v_point::text||':'||v_comm_r::text||':1');

  INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, sub_items, progress_percentage)
  SELECT v_constr,
         v_proj_code||': Deliver W&H Points (Construction Lead) — '||v_vcr,
         'Aggregate delivery bundle for Witness & Hold points',
         'wh_delivery_bundle','pending','High',
         'wh_delivery_bundle:'||v_point::text||':'||v_constr_r::text||':1',
         jsonb_build_object('source','p2a_handover','project_id',v_project,'project_code',v_proj_code,
                            'point_id',v_point,'vcr_code',v_vcr,'vcr_short_label',public.vcr_short_label(v_vcr),
                            'action','deliver_witness_hold',
                            'delivering_party_role_id', v_constr_r,'delivering_party_role','Construction Lead'),
         '[]'::jsonb, 0
   WHERE NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = 'wh_delivery_bundle:'||v_point::text||':'||v_constr_r::text||':1');

  PERFORM public.wh_restamp_bundles_for_point(v_point);
  PERFORM public.wh_fanout_review_tasks(v_row5);
END $seed$;
