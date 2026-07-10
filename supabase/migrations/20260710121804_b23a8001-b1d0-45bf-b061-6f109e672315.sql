
-- ═══════════════════════════════════════════════════════════════════════
-- APPROVAL-LEDGER RECONCILIATION (B2B shared-seat semantics)
-- 1) Plural resolver, 2) reconcile_vcr_approvals, 3) SUPERSEDED semantics,
-- 4) trigger on override changes.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Enum: add SUPERSEDED ─────────────────────────────────────────
ALTER TYPE public.vcr_prereq_approval_status ADD VALUE IF NOT EXISTS 'SUPERSEDED';

-- ─── 2. Unique constraint: (prereq, role) → (prereq, role, user) ─────
-- Drop old row-level unique; add partial unique indexes to preserve
-- idempotency while allowing B2B (multiple holders per role).
ALTER TABLE public.vcr_prerequisite_approvals
  DROP CONSTRAINT IF EXISTS vcr_prerequisite_approvals_prerequisite_id_approver_role_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vpa_prereq_role_user
  ON public.vcr_prerequisite_approvals (prerequisite_id, approver_role_id, approver_user_id)
  WHERE approver_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vpa_prereq_role_null_user
  ON public.vcr_prerequisite_approvals (prerequisite_id, approver_role_id)
  WHERE approver_user_id IS NULL;

-- ─── 3. Plural resolver: all holders at winning tier ─────────────────
CREATE OR REPLACE FUNCTION public.resolve_project_role_users(
  p_project_id uuid, p_role_label text
) RETURNS SETOF uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_role_id uuid; v_scope public.role_scope;
  v_region uuid; v_hub uuid; v_plant uuid;
  v_found boolean := false;
BEGIN
  SELECT id, scope INTO v_role_id, v_scope FROM public.roles
   WHERE name = p_role_label AND is_active AND NOT is_retired LIMIT 1;
  IF v_role_id IS NULL THEN RETURN; END IF;

  -- Tier 1: PTM overrides
  FOR v_role_id IN
    SELECT user_id FROM public.project_team_members
     WHERE project_id = p_project_id AND role = p_role_label
     ORDER BY created_at NULLS LAST, user_id
  LOOP
    v_found := true;
    RETURN NEXT v_role_id;
  END LOOP;
  IF v_found THEN RETURN; END IF;

  -- Re-fetch role_id (loop variable was reused)
  SELECT id INTO v_role_id FROM public.roles
   WHERE name = p_role_label AND is_active AND NOT is_retired LIMIT 1;

  -- Tier 2: scoped roster
  IF v_scope = 'portfolio' THEN
    SELECT region_id INTO v_region FROM public.projects WHERE id = p_project_id;
    IF v_region IS NOT NULL THEN
      RETURN QUERY
        SELECT user_id FROM public.region_role_holders
         WHERE region_id = v_region AND role_id = v_role_id
         ORDER BY assigned_at, user_id;
      IF FOUND THEN RETURN; END IF;
    END IF;
  ELSIF v_scope = 'hub' THEN
    SELECT hub_id INTO v_hub FROM public.projects WHERE id = p_project_id;
    IF v_hub IS NOT NULL THEN
      RETURN QUERY
        SELECT user_id FROM public.hub_role_holders
         WHERE hub_id = v_hub AND role_id = v_role_id
         ORDER BY assigned_at, user_id;
      IF FOUND THEN RETURN; END IF;
    END IF;
  ELSIF v_scope = 'plant' THEN
    SELECT plant_id INTO v_plant FROM public.projects WHERE id = p_project_id;
    IF v_plant IS NOT NULL THEN
      RETURN QUERY
        SELECT user_id FROM public.plant_role_holders
         WHERE plant_id = v_plant AND role_id = v_role_id
         ORDER BY assigned_at, user_id;
      IF FOUND THEN RETURN; END IF;
    END IF;
  END IF;

  -- Tier 3: org
  RETURN QUERY
    SELECT user_id FROM public.org_role_holders
     WHERE role_id = v_role_id
     ORDER BY assigned_at, user_id;
END
$fn$;

-- ─── 4. Prereq rollup: per-ROLE (shared seat) ────────────────────────
CREATE OR REPLACE FUNCTION public.recompute_vcr_prerequisite_from_approvals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_prereq_id uuid;
  v_total int; v_accepted int; v_rejected int; v_qualified int;
  v_current public.p2a_vcr_prerequisite_status;
  v_target  public.p2a_vcr_prerequisite_status;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  v_prereq_id := COALESCE(NEW.prerequisite_id, OLD.prerequisite_id);
  IF v_prereq_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  SELECT status INTO v_current FROM public.p2a_vcr_prerequisites WHERE id=v_prereq_id;
  IF v_current IN ('QUALIFICATION_APPROVED','NA') THEN RETURN NEW; END IF;

  -- Per-role effective status: a role is decided when ANY holder's row is
  -- ACCEPTED/REJECTED/QUALIFIED (SUPERSEDED means partner decided; still
  -- counts against the row that carries it). PENDING blocks the role.
  WITH per_role AS (
    SELECT approver_role_id,
      bool_or(status='REJECTED')  AS has_rej,
      bool_or(status='QUALIFIED') AS has_qual,
      bool_or(status='ACCEPTED')  AS has_acc,
      bool_or(status='PENDING')   AS has_pend
    FROM public.vcr_prerequisite_approvals
    WHERE prerequisite_id = v_prereq_id
    GROUP BY approver_role_id
  )
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE has_acc AND NOT has_pend AND NOT has_rej AND NOT has_qual),
         COUNT(*) FILTER (WHERE has_rej),
         COUNT(*) FILTER (WHERE has_qual)
  INTO v_total, v_accepted, v_rejected, v_qualified
  FROM per_role;

  IF v_total = 0 THEN RETURN NEW; END IF;

  IF v_rejected > 0 THEN
    v_target := 'REJECTED';
  ELSIF v_qualified > 0 THEN
    v_target := 'QUALIFICATION_REQUESTED';
  ELSIF v_accepted = v_total THEN
    v_target := 'ACCEPTED';
  ELSE
    RETURN NEW;
  END IF;

  IF v_target IS DISTINCT FROM v_current THEN
    UPDATE public.p2a_vcr_prerequisites
       SET status = v_target,
           reviewed_at = CASE WHEN v_target IN ('ACCEPTED','REJECTED') THEN now() ELSE reviewed_at END,
           updated_at = now()
     WHERE id = v_prereq_id;
  END IF;
  RETURN NEW;
END
$fn$;

-- ─── 5. Partner-supersede trigger (B2B shared seat) ──────────────────
-- When a holder decides (PENDING→ACCEPTED/REJECTED/QUALIFIED), mark the
-- partner rows on the same (prereq, role) as SUPERSEDED. Audit-preserving.
CREATE OR REPLACE FUNCTION public.supersede_partner_ledger_rows()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE'
     AND OLD.status = 'PENDING'
     AND NEW.status IN ('ACCEPTED','REJECTED','QUALIFIED') THEN
    UPDATE public.vcr_prerequisite_approvals
       SET status = 'SUPERSEDED',
           decided_at = COALESCE(decided_at, now()),
           updated_at = now()
     WHERE prerequisite_id = NEW.prerequisite_id
       AND approver_role_id = NEW.approver_role_id
       AND id <> NEW.id
       AND status = 'PENDING';
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_supersede_partner_ledger_rows ON public.vcr_prerequisite_approvals;
CREATE TRIGGER trg_supersede_partner_ledger_rows
  AFTER UPDATE OF status ON public.vcr_prerequisite_approvals
  FOR EACH ROW EXECUTE FUNCTION public.supersede_partner_ledger_rows();

-- ─── 6. reconcile_vcr_approvals(point_id) ────────────────────────────
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

  -- Build desired (prereq, role, user) triples from live catalog + override.
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

  -- Retire stale PENDING rows (role/user no longer in desired set).
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

  -- Flag decided rows on stale roles/users (keep for audit).
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

  -- Insert missing PENDING rows.
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

  -- Rebuild per-user bundles: one vcr_approval_bundle per (user, VCR) with
  -- REAL prereq ids as sub_items. Delete stale bundles for users no longer
  -- in the holder set (only when they carry no decided rows).
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
        'action','review_vcr_checklist_bundle')
    )
    ON CONFLICT (dedupe_key) DO UPDATE
      SET sub_items = EXCLUDED.sub_items,
          metadata  = public.user_tasks.metadata || EXCLUDED.metadata,
          updated_at= now();

    v_bundles_upserted := v_bundles_upserted + 1;
  END LOOP;

  -- Remove stale bundles (users not in current holder set) with no decisions.
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

-- ─── 7. Trigger: reconcile when override role_ids change ─────────────
CREATE OR REPLACE FUNCTION public.trg_reconcile_on_override_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' OR NEW.approving_party_role_ids_override IS DISTINCT FROM OLD.approving_party_role_ids_override THEN
    PERFORM public.reconcile_vcr_approvals(NEW.handover_point_id);
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_reconcile_on_override_change ON public.p2a_vcr_item_overrides;
CREATE TRIGGER trg_reconcile_on_override_change
  AFTER INSERT OR UPDATE OF approving_party_role_ids_override ON public.p2a_vcr_item_overrides
  FOR EACH ROW EXECUTE FUNCTION public.trg_reconcile_on_override_change();

-- ─── 8. create_vcr_approval_fanout: use plural resolver + reconcile ──
CREATE OR REPLACE FUNCTION public.create_vcr_approval_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  IF NEW.stage <> 'VCR' OR NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN
    RETURN NEW;
  END IF;
  IF NOT public.vcr_plan_is_approved(NEW.point_id) THEN
    RETURN NEW;
  END IF;
  PERFORM public.reconcile_vcr_approvals(NEW.point_id);
  RETURN NEW;
END
$fn$;
