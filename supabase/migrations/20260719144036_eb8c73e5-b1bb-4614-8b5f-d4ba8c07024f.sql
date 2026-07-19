
-- Patch: the unique index on user_tasks.dedupe_key is partial
-- (WHERE dedupe_key IS NOT NULL), so ON CONFLICT must repeat the predicate.
-- Replace both reconcile functions with the corrected ON CONFLICT clause.

CREATE OR REPLACE FUNCTION public.reconcile_vcr_delivery_tasks(p_handover_point_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_proj_id uuid; v_proj_code text;
  v_vcr text; v_vcr_name text; v_vcr_label text; v_short text; v_display text;
  v_user uuid; v_total int; v_sub jsonb; v_dedupe text; v_existing_id uuid;
  v_bundles_upserted int := 0; v_bundles_removed int := 0;
  v_item_tasks_upserted int := 0; v_item_tasks_retired int := 0;
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
      FROM resolved r JOIN public.roles ro ON ro.id = r.role_id
     WHERE r.role_id IS NOT NULL;

  FOR v_user IN SELECT DISTINCT user_id FROM _rec_del WHERE user_id IS NOT NULL
  LOOP
    SELECT jsonb_agg(DISTINCT jsonb_build_object(
             'prerequisite_id', d.prereq_id, 'summary', d.summary, 'completed', false)),
           COUNT(DISTINCT d.prereq_id)
      INTO v_sub, v_total
      FROM _rec_del d WHERE d.user_id = v_user;
    v_dedupe := 'vcr_checklist_bundle:'||p_handover_point_id::text||':user:'||v_user::text;
    SELECT id INTO v_existing_id FROM public.user_tasks WHERE dedupe_key = v_dedupe LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.user_tasks
         SET title = 'Deliver Items for '||v_display, sub_items = v_sub,
             metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
               'source','vcr_reconcile','contract','spec_v2',
               'project_id', v_proj_id, 'project_code', v_proj_code,
               'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
               'vcr_code', v_vcr, 'vcr_label', v_vcr_label,
               'vcr_short_label', v_short, 'vcr_name', v_vcr_name,
               'total_items', v_total, 'action','deliver_vcr_checklist_bundle'),
             updated_at = now()
       WHERE id = v_existing_id;
    ELSE
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, sub_items, progress_percentage, metadata)
      VALUES (v_user, 'Deliver Items for '||v_display, 'Deliver '||v_total||' item(s) for '||v_display||'.',
        'vcr_checklist_bundle','pending','Medium', v_dedupe, v_sub, 0,
        jsonb_build_object('source','vcr_reconcile','contract','spec_v2',
          'project_id', v_proj_id, 'project_code', v_proj_code,
          'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
          'vcr_code', v_vcr, 'vcr_label', v_vcr_label, 'vcr_short_label', v_short, 'vcr_name', v_vcr_name,
          'total_items', v_total, 'completed_items', 0, 'action','deliver_vcr_checklist_bundle'));
    END IF;
    v_bundles_upserted := v_bundles_upserted + 1;
  END LOOP;

  WITH stale_bundles AS (
    SELECT ut.id FROM public.user_tasks ut
    WHERE ut.type = 'vcr_checklist_bundle'
      AND ut.metadata->>'point_id' = p_handover_point_id::text
      AND ut.user_id NOT IN (SELECT DISTINCT user_id FROM _rec_del WHERE user_id IS NOT NULL)
      AND COALESCE(ut.progress_percentage,0) = 0
      AND ut.status IN ('pending','todo','waiting')
  ), delb AS (DELETE FROM public.user_tasks WHERE id IN (SELECT id FROM stale_bundles) RETURNING 1)
  SELECT count(*) INTO v_bundles_removed FROM delb;

  -- EXE-1a per-item action tasks (ON CONFLICT matches partial unique index)
  WITH ins AS (
    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, progress_percentage, metadata)
    SELECT d.user_id,
      'Deliver item · ' || d.summary || ' — ' || v_short,
      'Deliver evidence for prerequisite: ' || d.summary,
      'vcr_item_action','pending','Medium',
      'vcr_item_action:'||d.prereq_id::text||':role:'||d.role_id::text||':user:'||d.user_id::text,
      0,
      jsonb_build_object('source','vcr_reconcile','contract','exe1_item_v1',
        'action','deliver_vcr_checklist_bundle',
        'project_id', v_proj_id, 'project_code', v_proj_code,
        'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
        'vcr_code', v_vcr, 'vcr_short_label', v_short, 'vcr_name', v_vcr_name,
        'prerequisite_id', d.prereq_id, 'role_id', d.role_id, 'role_name', d.role_name,
        'parent_bundle_dedupe','vcr_checklist_bundle:'||p_handover_point_id::text||':user:'||d.user_id::text,
        'hidden_from_board', true)
    FROM _rec_del d WHERE d.user_id IS NOT NULL
    ON CONFLICT (dedupe_key) WHERE (dedupe_key IS NOT NULL) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_item_tasks_upserted FROM ins;

  WITH stale AS (
    SELECT ut.id FROM public.user_tasks ut
     WHERE ut.type = 'vcr_item_action'
       AND ut.metadata->>'point_id' = p_handover_point_id::text
       AND COALESCE(ut.progress_percentage,0) = 0
       AND ut.status IN ('pending','todo','waiting')
       AND NOT EXISTS (SELECT 1 FROM _rec_del d
         WHERE d.prereq_id::text = ut.metadata->>'prerequisite_id'
           AND d.role_id::text  = ut.metadata->>'role_id'
           AND d.user_id       = ut.user_id)
  ), delr AS (DELETE FROM public.user_tasks WHERE id IN (SELECT id FROM stale) RETURNING 1)
  SELECT count(*) INTO v_item_tasks_retired FROM delr;

  DROP TABLE IF EXISTS _rec_del;

  RETURN jsonb_build_object(
    'point_id', p_handover_point_id, 'vcr_label', v_vcr_label, 'vcr_short_label', v_short,
    'bundles_upserted', v_bundles_upserted, 'bundles_removed', v_bundles_removed,
    'item_tasks_upserted', v_item_tasks_upserted, 'item_tasks_retired', v_item_tasks_retired);
END $function$;


CREATE OR REPLACE FUNCTION public.reconcile_vcr_approvals(p_handover_point_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_proj_id uuid; v_proj_code text;
  v_vcr text; v_vcr_name text; v_vcr_label text; v_short text; v_display text;
  v_inserted int := 0; v_retired int := 0; v_stale_decided int := 0;
  v_user uuid; v_total int; v_sub jsonb; v_dedupe text;
  v_bundles_upserted int := 0; v_bundles_removed int := 0;
  v_item_tasks_upserted int := 0; v_item_tasks_retired int := 0;
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
        FROM actionable a JOIN public.vcr_items vi ON vi.id = a.vcr_item_id
        LEFT JOIN public.p2a_vcr_item_overrides o
          ON o.handover_point_id = p_handover_point_id AND o.vcr_item_id = a.vcr_item_id
    ),
    expanded AS (
      SELECT prereq_id, summary, unnest(role_ids) AS role_id
        FROM resolved WHERE role_ids IS NOT NULL AND array_length(role_ids,1) > 0
    )
    SELECT e.prereq_id, e.summary, e.role_id, r.name AS role_name,
           public.resolve_project_role_users(v_proj_id, r.name) AS user_id
      FROM expanded e JOIN public.roles r ON r.id = e.role_id;

  WITH stale AS (
    SELECT vpa.id FROM public.vcr_prerequisite_approvals vpa
    JOIN public.p2a_vcr_prerequisites p ON p.id = vpa.prerequisite_id
    WHERE p.handover_point_id = p_handover_point_id AND vpa.status = 'PENDING'
      AND NOT EXISTS (SELECT 1 FROM _rec_desired d
        WHERE d.prereq_id = vpa.prerequisite_id AND d.role_id = vpa.approver_role_id
          AND (d.user_id = vpa.approver_user_id OR (d.user_id IS NULL AND vpa.approver_user_id IS NULL)))
  ), del AS (DELETE FROM public.vcr_prerequisite_approvals WHERE id IN (SELECT id FROM stale) RETURNING 1)
  SELECT count(*) INTO v_retired FROM del;

  SELECT count(*) INTO v_stale_decided
    FROM public.vcr_prerequisite_approvals vpa
    JOIN public.p2a_vcr_prerequisites p ON p.id = vpa.prerequisite_id
   WHERE p.handover_point_id = p_handover_point_id AND vpa.status <> 'PENDING'
     AND NOT EXISTS (SELECT 1 FROM _rec_desired d
       WHERE d.prereq_id = vpa.prerequisite_id AND d.role_id = vpa.approver_role_id
         AND (d.user_id = vpa.approver_user_id OR (d.user_id IS NULL AND vpa.approver_user_id IS NULL)));

  WITH ins AS (
    INSERT INTO public.vcr_prerequisite_approvals (prerequisite_id, approver_role_id, approver_user_id, status)
    SELECT d.prereq_id, d.role_id, d.user_id, 'PENDING' FROM _rec_desired d
     WHERE NOT EXISTS (SELECT 1 FROM public.vcr_prerequisite_approvals vpa
       WHERE vpa.prerequisite_id = d.prereq_id AND vpa.approver_role_id = d.role_id
         AND (vpa.approver_user_id = d.user_id OR (vpa.approver_user_id IS NULL AND d.user_id IS NULL)))
    RETURNING 1
  ) SELECT count(*) INTO v_inserted FROM ins;

  FOR v_user IN SELECT DISTINCT user_id FROM _rec_desired WHERE user_id IS NOT NULL
  LOOP
    SELECT jsonb_agg(DISTINCT jsonb_build_object(
             'prerequisite_id', d.prereq_id, 'summary', d.summary, 'completed', false)),
           COUNT(DISTINCT d.prereq_id)
      INTO v_sub, v_total FROM _rec_desired d WHERE d.user_id = v_user;
    v_dedupe := 'vcr_approval_bundle:'||p_handover_point_id::text||':user:'||v_user::text;
    SELECT id INTO v_existing_id FROM public.user_tasks WHERE dedupe_key = v_dedupe LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.user_tasks
         SET title = 'Review Items for '||v_display, sub_items = v_sub,
             metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
               'source','vcr_reconcile','contract','spec_v2',
               'project_id', v_proj_id, 'project_code', v_proj_code,
               'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
               'vcr_code', v_vcr, 'vcr_label', v_vcr_label, 'vcr_short_label', v_short,
               'vcr_name', v_vcr_name, 'total_items', v_total, 'action','review_vcr_checklist_bundle'),
             updated_at = now() WHERE id = v_existing_id;
    ELSE
      INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, sub_items, progress_percentage, metadata)
      VALUES (v_user, 'Review Items for '||v_display,
        'Review and approve '||v_total||' item(s) for '||v_display||'.',
        'vcr_approval_bundle','pending','Medium', v_dedupe, v_sub, 0,
        jsonb_build_object('source','vcr_reconcile','contract','spec_v2',
          'project_id', v_proj_id, 'project_code', v_proj_code,
          'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
          'vcr_code', v_vcr, 'vcr_label', v_vcr_label, 'vcr_short_label', v_short,
          'vcr_name', v_vcr_name, 'total_items', v_total, 'completed_items', 0,
          'action','review_vcr_checklist_bundle'));
    END IF;
    v_bundles_upserted := v_bundles_upserted + 1;
  END LOOP;

  WITH stale_bundles AS (
    SELECT ut.id FROM public.user_tasks ut
    WHERE ut.type = 'vcr_approval_bundle'
      AND ut.metadata->>'point_id' = p_handover_point_id::text
      AND ut.user_id NOT IN (SELECT DISTINCT user_id FROM _rec_desired WHERE user_id IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM public.vcr_prerequisite_approvals vpa
        JOIN public.p2a_vcr_prerequisites p ON p.id = vpa.prerequisite_id
        WHERE p.handover_point_id = p_handover_point_id
          AND vpa.approver_user_id = ut.user_id AND vpa.status <> 'PENDING')
  ), delb AS (DELETE FROM public.user_tasks WHERE id IN (SELECT id FROM stale_bundles) RETURNING 1)
  SELECT count(*) INTO v_bundles_removed FROM delb;

  -- EXE-1a per-item review tasks
  WITH pending_rows AS (
    SELECT vpa.prerequisite_id, vpa.approver_role_id, vpa.approver_user_id,
           p.summary, r.name AS role_name
      FROM public.vcr_prerequisite_approvals vpa
      JOIN public.p2a_vcr_prerequisites p ON p.id = vpa.prerequisite_id
      JOIN public.roles r ON r.id = vpa.approver_role_id
     WHERE p.handover_point_id = p_handover_point_id
       AND vpa.status = 'PENDING' AND vpa.approver_user_id IS NOT NULL
  ), ins AS (
    INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, dedupe_key, progress_percentage, metadata)
    SELECT pr.approver_user_id,
      'Review item · ' || pr.summary || ' — ' || v_short,
      'Review and decide prerequisite: ' || pr.summary,
      'vcr_item_review','pending','Medium',
      'vcr_item_review:'||pr.prerequisite_id::text||':role:'||pr.approver_role_id::text||':user:'||pr.approver_user_id::text,
      0,
      jsonb_build_object('source','vcr_reconcile','contract','exe1_item_v1',
        'action','review_vcr_checklist_bundle',
        'project_id', v_proj_id, 'project_code', v_proj_code,
        'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
        'vcr_code', v_vcr, 'vcr_short_label', v_short, 'vcr_name', v_vcr_name,
        'prerequisite_id', pr.prerequisite_id, 'role_id', pr.approver_role_id, 'role_name', pr.role_name,
        'parent_bundle_dedupe','vcr_approval_bundle:'||p_handover_point_id::text||':user:'||pr.approver_user_id::text,
        'hidden_from_board', true)
    FROM pending_rows pr
    ON CONFLICT (dedupe_key) WHERE (dedupe_key IS NOT NULL) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO v_item_tasks_upserted FROM ins;

  WITH stale AS (
    SELECT ut.id FROM public.user_tasks ut
     WHERE ut.type = 'vcr_item_review'
       AND ut.metadata->>'point_id' = p_handover_point_id::text
       AND COALESCE(ut.progress_percentage,0) = 0
       AND ut.status IN ('pending','todo','waiting')
       AND NOT EXISTS (SELECT 1 FROM public.vcr_prerequisite_approvals vpa
         WHERE vpa.prerequisite_id::text = ut.metadata->>'prerequisite_id'
           AND vpa.approver_role_id::text = ut.metadata->>'role_id'
           AND vpa.approver_user_id = ut.user_id AND vpa.status = 'PENDING')
  ), delr AS (DELETE FROM public.user_tasks WHERE id IN (SELECT id FROM stale) RETURNING 1)
  SELECT count(*) INTO v_item_tasks_retired FROM delr;

  DROP TABLE IF EXISTS _rec_desired;

  RETURN jsonb_build_object(
    'point_id', p_handover_point_id, 'vcr_label', v_vcr_label, 'vcr_short_label', v_short,
    'inserted_pending_rows', v_inserted, 'retired_pending_rows', v_retired,
    'stale_decided_rows_flagged', v_stale_decided,
    'bundles_upserted', v_bundles_upserted, 'bundles_removed', v_bundles_removed,
    'item_tasks_upserted', v_item_tasks_upserted, 'item_tasks_retired', v_item_tasks_retired);
END $function$;
