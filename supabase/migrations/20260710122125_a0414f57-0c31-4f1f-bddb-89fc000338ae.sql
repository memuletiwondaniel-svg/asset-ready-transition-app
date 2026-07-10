
CREATE OR REPLACE FUNCTION public.reconcile_vcr_approvals(p_handover_point_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_proj_id uuid;
  v_proj_code text;
  v_vcr text; v_vcr_name text; v_vcr_label text;
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

    SELECT id INTO v_existing_id
      FROM public.user_tasks
     WHERE dedupe_key = v_dedupe
     LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.user_tasks
         SET sub_items = v_sub,
             metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
               'source','vcr_reconcile','contract','spec_v2',
               'project_id', v_proj_id, 'project_code', v_proj_code,
               'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
               'vcr_code', v_vcr, 'vcr_label', v_vcr_label,
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
        'VCR Review Items – '||v_vcr_label,
        'Review and approve '||v_total||' checklist item(s) for '||v_vcr_label||'.',
        'vcr_approval_bundle','pending','Medium',
        v_dedupe, v_sub, 0,
        jsonb_build_object(
          'source','vcr_reconcile','contract','spec_v2',
          'project_id', v_proj_id, 'project_code', v_proj_code,
          'point_id', p_handover_point_id, 'vcr_id', p_handover_point_id,
          'vcr_code', v_vcr, 'vcr_label', v_vcr_label,
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
    'inserted_pending_rows', v_inserted,
    'retired_pending_rows', v_retired,
    'stale_decided_rows_flagged', v_stale_decided,
    'bundles_upserted', v_bundles_upserted,
    'bundles_removed', v_bundles_removed
  );
END
$fn$;
