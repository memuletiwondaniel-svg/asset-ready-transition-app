
-- ═══════════════════════════════════════════════════════════════════════
-- Title helper: VCR-DP300-02 → VCR-02  (falls back to input if no match)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.vcr_short_label(p_vcr_code text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    NULLIF(regexp_replace(COALESCE(p_vcr_code,''), '^VCR-[A-Za-z0-9]+-', 'VCR-'), ''),
    p_vcr_code
  )
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- 1) reconcile_vcr_approvals — new bundle title format, human short label
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.reconcile_vcr_approvals(p_handover_point_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_proj_id uuid; v_proj_code text;
  v_vcr text; v_vcr_name text; v_vcr_label text; v_short text; v_display text;
  v_inserted int := 0; v_retired int := 0; v_stale_decided int := 0;
  v_user uuid; v_total int; v_sub jsonb; v_dedupe text;
  v_bundles_upserted int := 0; v_bundles_removed int := 0;
  v_existing_id uuid;
BEGIN
  SELECT pl.project_id,
         COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''),
         pt.vcr_code, pt.name
    INTO v_proj_id, v_proj_code, v_vcr, v_vcr_name
  FROM public.p2a_handover_points pt
  JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
  JOIN public.projects pr ON pr.id = pl.project_id
  WHERE pt.id = p_handover_point_id;
  IF v_proj_id IS NULL THEN RETURN jsonb_build_object('error','handover_point_not_found'); END IF;
  v_vcr_label := v_vcr || COALESCE(': '||v_vcr_name, '');
  v_short := public.vcr_short_label(v_vcr);
  v_display := v_short || COALESCE(' ('||v_vcr_name||')', '');

  CREATE TEMP TABLE _rec_desired ON COMMIT DROP AS
    WITH actionable AS (
      SELECT p.id AS prereq_id, p.summary, p.vcr_item_id
        FROM public.p2a_vcr_prerequisites p
       WHERE p.handover_point_id = p_handover_point_id
         AND p.status NOT IN ('ACCEPTED','QUALIFICATION_APPROVED','NA')
         AND p.vcr_item_id IS NOT NULL
    ),
    resolved AS (
      SELECT a.prereq_id, a.summary, a.vcr_item_id,
             COALESCE(o.approving_party_role_ids_override, vi.approving_party_role_ids) AS role_ids
        FROM actionable a
        JOIN public.vcr_items vi ON vi.id = a.vcr_item_id
        LEFT JOIN public.p2a_vcr_item_overrides o
          ON o.handover_point_id = p_handover_point_id AND o.vcr_item_id = a.vcr_item_id
    ),
    expanded AS (
      SELECT prereq_id, summary, unnest(role_ids) AS role_id
        FROM resolved
       WHERE role_ids IS NOT NULL AND array_length(role_ids,1) > 0
    )
    SELECT e.prereq_id, e.summary, e.role_id, r.name AS role_name,
           public.resolve_project_role_users(v_proj_id, r.name) AS user_id
      FROM expanded e
      JOIN public.roles r ON r.id = e.role_id;

  WITH stale AS (
    SELECT vpa.id FROM public.vcr_prerequisite_approvals vpa
    JOIN public.p2a_vcr_prerequisites p ON p.id = vpa.prerequisite_id
    WHERE p.handover_point_id = p_handover_point_id
      AND vpa.status = 'PENDING'
      AND NOT EXISTS (
        SELECT 1 FROM _rec_desired d
        WHERE d.prereq_id = vpa.prerequisite_id
          AND d.role_id = vpa.approver_role_id
          AND (d.user_id = vpa.approver_user_id OR (d.user_id IS NULL AND vpa.approver_user_id IS NULL))
      )
  ), del AS (
    DELETE FROM public.vcr_prerequisite_approvals WHERE id IN (SELECT id FROM stale) RETURNING 1
  )
  SELECT count(*) INTO v_retired FROM del;

  SELECT count(*) INTO v_stale_decided
    FROM public.vcr_prerequisite_approvals vpa
    JOIN public.p2a_vcr_prerequisites p ON p.id = vpa.prerequisite_id
   WHERE p.handover_point_id = p_handover_point_id
     AND vpa.status <> 'PENDING'
     AND NOT EXISTS (
       SELECT 1 FROM _rec_desired d
       WHERE d.prereq_id = vpa.prerequisite_id
         AND d.role_id = vpa.approver_role_id
         AND (d.user_id = vpa.approver_user_id OR (d.user_id IS NULL AND vpa.approver_user_id IS NULL))
     );

  WITH ins AS (
    INSERT INTO public.vcr_prerequisite_approvals (prerequisite_id, approver_role_id, approver_user_id, status)
    SELECT d.prereq_id, d.role_id, d.user_id, 'PENDING'
      FROM _rec_desired d
     WHERE NOT EXISTS (
       SELECT 1 FROM public.vcr_prerequisite_approvals vpa
       WHERE vpa.prerequisite_id = d.prereq_id
         AND vpa.approver_role_id = d.role_id
         AND (vpa.approver_user_id = d.user_id OR (vpa.approver_user_id IS NULL AND d.user_id IS NULL))
     )
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  FOR v_user IN
    SELECT DISTINCT user_id FROM _rec_desired WHERE user_id IS NOT NULL
  LOOP
    SELECT jsonb_agg(DISTINCT jsonb_build_object(
             'prerequisite_id', d.prereq_id,
             'summary', d.summary,
             'completed', false)),
           COUNT(DISTINCT d.prereq_id)
      INTO v_sub, v_total
      FROM _rec_desired d WHERE d.user_id = v_user;

    v_dedupe := 'vcr_approval_bundle:'||p_handover_point_id::text||':user:'||v_user::text;

    SELECT id INTO v_existing_id FROM public.user_tasks WHERE dedupe_key = v_dedupe LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.user_tasks
         SET title = 'Review Items for '||v_display,
             sub_items = v_sub,
             metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
               'source','vcr_reconcile','contract','spec_v2',
               'project_id', v_proj_id, 'project_code', v_proj_code,
               'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
               'vcr_code', v_vcr, 'vcr_label', v_vcr_label,
               'vcr_short_label', v_short, 'vcr_name', v_vcr_name,
               'total_items', v_total,
               'action','review_vcr_checklist_bundle'),
             updated_at = now()
       WHERE id = v_existing_id;
    ELSE
      INSERT INTO public.user_tasks (
        user_id, title, description, type, status, priority,
        dedupe_key, sub_items, progress_percentage, metadata
      ) VALUES (
        v_user,
        'Review Items for '||v_display,
        'Review and approve '||v_total||' item(s) for '||v_display||'.',
        'vcr_approval_bundle','pending','Medium',
        v_dedupe, v_sub, 0,
        jsonb_build_object(
          'source','vcr_reconcile','contract','spec_v2',
          'project_id', v_proj_id, 'project_code', v_proj_code,
          'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
          'vcr_code', v_vcr, 'vcr_label', v_vcr_label,
          'vcr_short_label', v_short, 'vcr_name', v_vcr_name,
          'total_items', v_total, 'completed_items', 0,
          'action','review_vcr_checklist_bundle'));
    END IF;
    v_bundles_upserted := v_bundles_upserted + 1;
  END LOOP;

  WITH stale_bundles AS (
    SELECT ut.id FROM public.user_tasks ut
    WHERE ut.type = 'vcr_approval_bundle'
      AND ut.metadata->>'point_id' = p_handover_point_id::text
      AND ut.user_id NOT IN (SELECT DISTINCT user_id FROM _rec_desired WHERE user_id IS NOT NULL)
      AND NOT EXISTS (
        SELECT 1 FROM public.vcr_prerequisite_approvals vpa
        JOIN public.p2a_vcr_prerequisites p ON p.id = vpa.prerequisite_id
        WHERE p.handover_point_id = p_handover_point_id
          AND vpa.approver_user_id = ut.user_id
          AND vpa.status <> 'PENDING'
      )
  ), delb AS (
    DELETE FROM public.user_tasks WHERE id IN (SELECT id FROM stale_bundles) RETURNING 1
  )
  SELECT count(*) INTO v_bundles_removed FROM delb;

  DROP TABLE IF EXISTS _rec_desired;

  RETURN jsonb_build_object(
    'point_id', p_handover_point_id,
    'vcr_label', v_vcr_label,
    'vcr_short_label', v_short,
    'inserted_pending_rows', v_inserted,
    'retired_pending_rows', v_retired,
    'stale_decided_rows_flagged', v_stale_decided,
    'bundles_upserted', v_bundles_upserted,
    'bundles_removed', v_bundles_removed
  );
END
$fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2) reconcile_vcr_delivery_tasks — sibling for delivery side
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.reconcile_vcr_delivery_tasks(p_handover_point_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_proj_id uuid; v_proj_code text;
  v_vcr text; v_vcr_name text; v_vcr_label text; v_short text; v_display text;
  v_user uuid; v_total int; v_sub jsonb; v_dedupe text; v_existing_id uuid;
  v_bundles_upserted int := 0; v_bundles_removed int := 0;
BEGIN
  SELECT pl.project_id,
         COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''),
         pt.vcr_code, pt.name
    INTO v_proj_id, v_proj_code, v_vcr, v_vcr_name
  FROM public.p2a_handover_points pt
  JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
  JOIN public.projects pr ON pr.id = pl.project_id
  WHERE pt.id = p_handover_point_id;
  IF v_proj_id IS NULL THEN RETURN jsonb_build_object('error','handover_point_not_found'); END IF;
  v_vcr_label := v_vcr || COALESCE(': '||v_vcr_name, '');
  v_short := public.vcr_short_label(v_vcr);
  v_display := v_short || COALESCE(' ('||v_vcr_name||')', '');

  CREATE TEMP TABLE _rec_del ON COMMIT DROP AS
    WITH actionable AS (
      SELECT p.id AS prereq_id, p.summary, p.vcr_item_id
        FROM public.p2a_vcr_prerequisites p
       WHERE p.handover_point_id = p_handover_point_id
         AND p.status NOT IN ('ACCEPTED','QUALIFICATION_APPROVED','NA')
         AND p.vcr_item_id IS NOT NULL
    ),
    resolved AS (
      SELECT a.prereq_id, a.summary, a.vcr_item_id,
             COALESCE(o.delivering_party_role_id_override, vi.delivering_party_role_id) AS role_id
        FROM actionable a
        JOIN public.vcr_items vi ON vi.id = a.vcr_item_id
        LEFT JOIN public.p2a_vcr_item_overrides o
          ON o.handover_point_id = p_handover_point_id AND o.vcr_item_id = a.vcr_item_id
    )
    SELECT r.prereq_id, r.summary, r.role_id, ro.name AS role_name,
           public.resolve_project_role_users(v_proj_id, ro.name) AS user_id
      FROM resolved r
      JOIN public.roles ro ON ro.id = r.role_id
     WHERE r.role_id IS NOT NULL;

  FOR v_user IN
    SELECT DISTINCT user_id FROM _rec_del WHERE user_id IS NOT NULL
  LOOP
    SELECT jsonb_agg(DISTINCT jsonb_build_object(
             'prerequisite_id', d.prereq_id,
             'summary', d.summary,
             'completed', false)),
           COUNT(DISTINCT d.prereq_id)
      INTO v_sub, v_total
      FROM _rec_del d WHERE d.user_id = v_user;

    v_dedupe := 'vcr_checklist_bundle:'||p_handover_point_id::text||':user:'||v_user::text;

    SELECT id INTO v_existing_id FROM public.user_tasks WHERE dedupe_key = v_dedupe LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.user_tasks
         SET title = 'Deliver Items for '||v_display,
             sub_items = v_sub,
             metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
               'source','vcr_reconcile','contract','spec_v2',
               'project_id', v_proj_id, 'project_code', v_proj_code,
               'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
               'vcr_code', v_vcr, 'vcr_label', v_vcr_label,
               'vcr_short_label', v_short, 'vcr_name', v_vcr_name,
               'total_items', v_total,
               'action','deliver_vcr_checklist_bundle'),
             updated_at = now()
       WHERE id = v_existing_id;
    ELSE
      INSERT INTO public.user_tasks (
        user_id, title, description, type, status, priority,
        dedupe_key, sub_items, progress_percentage, metadata
      ) VALUES (
        v_user,
        'Deliver Items for '||v_display,
        'Deliver '||v_total||' item(s) for '||v_display||'.',
        'vcr_checklist_bundle','pending','Medium',
        v_dedupe, v_sub, 0,
        jsonb_build_object(
          'source','vcr_reconcile','contract','spec_v2',
          'project_id', v_proj_id, 'project_code', v_proj_code,
          'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
          'vcr_code', v_vcr, 'vcr_label', v_vcr_label,
          'vcr_short_label', v_short, 'vcr_name', v_vcr_name,
          'total_items', v_total, 'completed_items', 0,
          'action','deliver_vcr_checklist_bundle'));
    END IF;
    v_bundles_upserted := v_bundles_upserted + 1;
  END LOOP;

  -- Retire bundles whose user no longer resolves AND has NO recorded progress
  WITH stale_bundles AS (
    SELECT ut.id FROM public.user_tasks ut
    WHERE ut.type = 'vcr_checklist_bundle'
      AND ut.metadata->>'point_id' = p_handover_point_id::text
      AND ut.user_id NOT IN (SELECT DISTINCT user_id FROM _rec_del WHERE user_id IS NOT NULL)
      AND COALESCE(ut.progress_percentage,0) = 0
      AND ut.status IN ('pending','todo','waiting')
  ), delb AS (
    DELETE FROM public.user_tasks WHERE id IN (SELECT id FROM stale_bundles) RETURNING 1
  )
  SELECT count(*) INTO v_bundles_removed FROM delb;

  DROP TABLE IF EXISTS _rec_del;

  RETURN jsonb_build_object(
    'point_id', p_handover_point_id,
    'vcr_label', v_vcr_label,
    'vcr_short_label', v_short,
    'bundles_upserted', v_bundles_upserted,
    'bundles_removed', v_bundles_removed
  );
END
$fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3) Amend approval-bundle recompute status rules (waiting/pending/…)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.recompute_vcr_approval_bundle_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_approver uuid; v_prereq uuid; v_task record;
  v_total int; v_decided int; v_accepted int; v_rejected int; v_qualified int;
  v_awaiting int; v_parties int; v_pct int; v_new_status text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN COALESCE(NEW, OLD); END IF;
  v_approver := COALESCE(NEW.approver_user_id, OLD.approver_user_id);
  v_prereq   := COALESCE(NEW.prerequisite_id,  OLD.prerequisite_id);
  IF v_approver IS NULL OR v_prereq IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  FOR v_task IN
    SELECT ut.id, ut.sub_items, ut.status, ut.metadata
    FROM public.user_tasks ut
    WHERE ut.type = 'vcr_approval_bundle' AND ut.user_id = v_approver
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(ut.sub_items, '[]'::jsonb)) AS item
        WHERE (item->>'prerequisite_id')::uuid = v_prereq
      )
  LOOP
    SELECT COUNT(*) INTO v_total
      FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item
      WHERE (item->>'prerequisite_id') IS NOT NULL;

    SELECT
      COUNT(*) FILTER (WHERE vpa.status <> 'PENDING'),
      COUNT(*) FILTER (WHERE vpa.status = 'PENDING'),
      COUNT(*) FILTER (WHERE vpa.status = 'ACCEPTED'),
      COUNT(*) FILTER (WHERE vpa.status = 'REJECTED'),
      COUNT(*) FILTER (WHERE vpa.status = 'QUALIFIED')
    INTO v_decided, v_awaiting, v_accepted, v_rejected, v_qualified
    FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item
    JOIN public.vcr_prerequisite_approvals vpa
      ON vpa.prerequisite_id = (item->>'prerequisite_id')::uuid
     AND vpa.approver_user_id = v_approver;

    SELECT COUNT(DISTINCT p.delivering_party_id) INTO v_parties
      FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item
      JOIN public.p2a_vcr_prerequisites p ON p.id = (item->>'prerequisite_id')::uuid
      WHERE p.delivering_party_id IS NOT NULL;

    v_pct := CASE WHEN v_total > 0 THEN ROUND((COALESCE(v_decided,0)::numeric / v_total) * 100) ELSE 0 END;

    IF v_total > 0 AND COALESCE(v_decided,0) >= v_total THEN
      v_new_status := 'completed';
    ELSIF COALESCE(v_decided,0) = 0 AND COALESCE(v_awaiting,0) = 0 THEN
      v_new_status := 'waiting';
    ELSIF COALESCE(v_decided,0) = 0 AND COALESCE(v_awaiting,0) > 0 THEN
      v_new_status := 'pending';
    ELSE
      v_new_status := 'in_progress';
    END IF;

    UPDATE public.user_tasks
       SET progress_percentage = v_pct,
           status = v_new_status,
           metadata = COALESCE(v_task.metadata, '{}'::jsonb) || jsonb_build_object(
             'approver_total_items',    v_total,
             'approver_decided_items',  COALESCE(v_decided,0),
             'approver_awaiting_items', COALESCE(v_awaiting,0),
             'approver_accepted_items', COALESCE(v_accepted,0),
             'approver_rejected_items', COALESCE(v_rejected,0),
             'approver_qualified_items',COALESCE(v_qualified,0),
             'delivering_parties_count',COALESCE(v_parties,0)
           ),
           updated_at = now()
     WHERE id = v_task.id;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END
$fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 4) NEW: checklist-bundle recompute trigger (delivery side)
-- Fires on p2a_vcr_prerequisites.status update
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.recompute_vcr_checklist_bundle_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_task record; v_total int; v_submitted int; v_approved int; v_pct int; v_new_status text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  FOR v_task IN
    SELECT ut.id, ut.sub_items, ut.status, ut.metadata
    FROM public.user_tasks ut
    WHERE ut.type = 'vcr_checklist_bundle'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(ut.sub_items, '[]'::jsonb)) AS item
        WHERE (item->>'prerequisite_id')::uuid = COALESCE(NEW.id, OLD.id)
      )
  LOOP
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE p.status IN ('READY_FOR_REVIEW','ACCEPTED','QUALIFICATION_REQUESTED','QUALIFICATION_APPROVED')),
      COUNT(*) FILTER (WHERE p.status IN ('ACCEPTED','QUALIFICATION_APPROVED'))
    INTO v_total, v_submitted, v_approved
    FROM jsonb_array_elements(COALESCE(v_task.sub_items, '[]'::jsonb)) AS item
    JOIN public.p2a_vcr_prerequisites p ON p.id = (item->>'prerequisite_id')::uuid;

    v_pct := CASE WHEN v_total > 0 THEN ROUND((COALESCE(v_approved,0)::numeric / v_total) * 100) ELSE 0 END;

    IF v_total > 0 AND COALESCE(v_approved,0) >= v_total THEN
      v_new_status := 'completed';
    ELSIF COALESCE(v_submitted,0) > 0 THEN
      v_new_status := 'in_progress';
    ELSE
      v_new_status := 'pending';
    END IF;

    UPDATE public.user_tasks
       SET progress_percentage = v_pct,
           status = v_new_status,
           metadata = COALESCE(v_task.metadata, '{}'::jsonb) || jsonb_build_object(
             'delivering_total_items',     v_total,
             'delivering_submitted_items', COALESCE(v_submitted,0),
             'delivering_approved_items',  COALESCE(v_approved,0)
           ),
           updated_at = now()
     WHERE id = v_task.id;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END
$fn$;

DROP TRIGGER IF EXISTS trg_recompute_vcr_checklist_bundle ON public.p2a_vcr_prerequisites;
CREATE TRIGGER trg_recompute_vcr_checklist_bundle
  AFTER UPDATE OF status ON public.p2a_vcr_prerequisites
  FOR EACH ROW EXECUTE FUNCTION public.recompute_vcr_checklist_bundle_progress();

-- ═══════════════════════════════════════════════════════════════════════
-- 5) Override trigger: react to delivering-role override changes too
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_reconcile_on_override_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF TG_OP='INSERT'
     OR NEW.approving_party_role_ids_override  IS DISTINCT FROM OLD.approving_party_role_ids_override
     OR NEW.delivering_party_role_id_override IS DISTINCT FROM OLD.delivering_party_role_id_override THEN
    PERFORM public.reconcile_vcr_approvals(NEW.handover_point_id);
    PERFORM public.reconcile_vcr_delivery_tasks(NEW.handover_point_id);
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_reconcile_on_override_change ON public.p2a_vcr_item_overrides;
CREATE TRIGGER trg_reconcile_on_override_change
  AFTER INSERT OR UPDATE OF approving_party_role_ids_override, delivering_party_role_id_override
  ON public.p2a_vcr_item_overrides
  FOR EACH ROW EXECUTE FUNCTION public.trg_reconcile_on_override_change();

-- ═══════════════════════════════════════════════════════════════════════
-- 6) Extend plan-approval fanout to also run delivery reconcile
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_vcr_approval_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  IF NEW.stage <> 'VCR' OR NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN RETURN NEW; END IF;
  IF NOT public.vcr_plan_is_approved(NEW.point_id) THEN RETURN NEW; END IF;
  PERFORM public.reconcile_vcr_approvals(NEW.point_id);
  PERFORM public.reconcile_vcr_delivery_tasks(NEW.point_id);
  RETURN NEW;
END
$fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 7) Retitle create_vcr_deliverable_fanout (Sr-ORA aggregate tasks)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_vcr_deliverable_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_proj_id uuid; v_proj_code text; v_sr uuid; v_vcr text; v_vcr_name text;
  v_short text; v_display text; v_handover uuid;
  v_d RECORD; v_parent_id uuid; v_dedupe text; v_sub_dedupe text;
  v_child RECORD; v_idx int;
  v_actions jsonb := jsonb_build_array(
    jsonb_build_object('action','deliver_training',             'title_prefix','Deliver Training',
                       'detail_table','p2a_vcr_training',             'filter_sql',''),
    jsonb_build_object('action','deliver_procedures',           'title_prefix','Deliver Procedures',
                       'detail_table','p2a_vcr_procedures',           'filter_sql',''),
    jsonb_build_object('action','deliver_critical_docs',        'title_prefix','Deliver Critical Documents',
                       'detail_table','p2a_vcr_critical_docs',        'filter_sql',''),
    jsonb_build_object('action','deliver_procedures_registers', 'title_prefix','Deliver Procedures & Registers',
                       'detail_table','p2a_vcr_operational_registers','filter_sql',''),
    jsonb_build_object('action','complete_witness_hold',        'title_prefix','Complete Witness and Hold Points',
                       'detail_table','p2a_itp_activities',
                       'filter_sql',$flt$ AND inspection_type IN ('WITNESS','HOLD') $flt$)
  );
  v_a jsonb; v_title_col text;
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

    v_title_col := CASE WHEN (v_a->>'detail_table') = 'p2a_itp_activities' THEN 'activity_name' ELSE 'title' END;
    v_idx := 0;
    FOR v_child IN EXECUTE format(
      'SELECT id, %I AS row_title FROM public.%I WHERE handover_point_id = $1 %s ORDER BY display_order, created_at',
      v_title_col, (v_a->>'detail_table'), (v_a->>'filter_sql')
    ) USING NEW.point_id
    LOOP
      v_idx := v_idx + 1;
      v_sub_dedupe := (v_a->>'action')||'_sub:'||NEW.point_id::text||':'||v_child.id::text||':1';
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, metadata, parent_task_id)
      VALUES (v_sr,
        (v_a->>'title_prefix')||' for '||v_display||' — '||COALESCE(v_child.row_title, 'Item '||v_idx::text),
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
  RETURN NEW;
END
$fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 8) Backfill: rewrite titles of existing open VCR tasks to human form
--    Only open tasks; metadata untouched except adding vcr_short_label / vcr_name.
-- ═══════════════════════════════════════════════════════════════════════
DO $backfill$
DECLARE
  v_row record;
  v_short text;
  v_display text;
  v_name text;
  v_prefix text;
  v_count int := 0;
BEGIN
  FOR v_row IN
    SELECT ut.id, ut.type, ut.title, ut.metadata,
           ut.metadata->>'vcr_code' AS vcr_code,
           ut.metadata->>'action'   AS action,
           ut.parent_task_id
    FROM public.user_tasks ut
    WHERE ut.status <> 'completed'
      AND (ut.metadata ? 'vcr_code' OR ut.type LIKE 'vcr\_%' ESCAPE '\')
  LOOP
    IF v_row.vcr_code IS NULL THEN CONTINUE; END IF;

    SELECT pt.name INTO v_name
      FROM public.p2a_handover_points pt
     WHERE pt.vcr_code = v_row.vcr_code
     LIMIT 1;

    v_short := public.vcr_short_label(v_row.vcr_code);
    v_display := v_short || COALESCE(' ('||v_name||')','');

    -- Choose prefix
    v_prefix := CASE
      WHEN v_row.type = 'vcr_approval_bundle'  THEN 'Review Items'
      WHEN v_row.type = 'vcr_checklist_bundle' THEN 'Deliver Items'
      WHEN v_row.action = 'deliver_training'             THEN 'Deliver Training'
      WHEN v_row.action = 'deliver_procedures'           THEN 'Deliver Procedures'
      WHEN v_row.action = 'deliver_critical_docs'        THEN 'Deliver Critical Documents'
      WHEN v_row.action = 'deliver_procedures_registers' THEN 'Deliver Procedures & Registers'
      WHEN v_row.action = 'complete_witness_hold'        THEN 'Complete Witness and Hold Points'
      WHEN v_row.action LIKE 'deliver_training_item%'             THEN 'Deliver Training'
      WHEN v_row.action LIKE 'deliver_procedures_item%'           THEN 'Deliver Procedures'
      WHEN v_row.action LIKE 'deliver_critical_docs_item%'        THEN 'Deliver Critical Documents'
      WHEN v_row.action LIKE 'deliver_procedures_registers_item%' THEN 'Deliver Procedures & Registers'
      WHEN v_row.action LIKE 'complete_witness_hold_item%'        THEN 'Complete Witness and Hold Points'
      ELSE NULL
    END;

    IF v_prefix IS NULL THEN CONTINUE; END IF;

    -- Sub-tasks preserve any " — <detail>" suffix from old title
    IF v_row.parent_task_id IS NOT NULL AND position(' — ' in v_row.title) > 0 THEN
      UPDATE public.user_tasks
         SET title = v_prefix || ' for ' || v_display
                     || substring(v_row.title from position(' — ' in v_row.title)),
             metadata = COALESCE(metadata,'{}'::jsonb)
                        || jsonb_build_object('vcr_short_label', v_short, 'vcr_name', v_name),
             updated_at = now()
       WHERE id = v_row.id;
    ELSE
      UPDATE public.user_tasks
         SET title = v_prefix || ' for ' || v_display,
             metadata = COALESCE(metadata,'{}'::jsonb)
                        || jsonb_build_object('vcr_short_label', v_short, 'vcr_name', v_name),
             updated_at = now()
       WHERE id = v_row.id;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'vcr title backfill updated_rows=%', v_count;
END
$backfill$;
