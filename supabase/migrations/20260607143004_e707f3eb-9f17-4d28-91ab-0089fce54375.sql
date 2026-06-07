
-- ─────────────────────────────────────────────────────────────────────────
-- E-1a: R23 approving-party multi-role fan-out (additive).
--
-- Builds on existing patterns:
--   * resolve_project_role_user for role→user resolution
--   * dedupe_key idempotency on user_tasks
--   * vcr_plan_is_approved() as the 4-of-4 gate
--   * p2a_vcr_item_overrides for per-VCR catalog overrides (reused, not duplicated)
--   * supersede-not-delete on revision
-- ─────────────────────────────────────────────────────────────────────────

-- 1) Catalog FK on the per-VCR instance ─────────────────────────────────
ALTER TABLE public.p2a_vcr_prerequisites
  ADD COLUMN IF NOT EXISTS vcr_item_id uuid REFERENCES public.vcr_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_p2a_vcr_prereqs_vcr_item
  ON public.p2a_vcr_prerequisites(vcr_item_id);

COMMENT ON COLUMN public.p2a_vcr_prerequisites.pac_prerequisite_id IS
  'DEPRECATED — instances are now sourced from vcr_items via vcr_item_id. Kept for backward compat; do not read in new code.';
COMMENT ON COLUMN public.p2a_vcr_prerequisites.vcr_item_id IS
  'FK to vcr_items (catalog). R23 reads approving_party_role_ids live via this link, with p2a_vcr_item_overrides taking precedence.';

-- Backfill: match by exact summary text where unambiguous.
DO $$
DECLARE v_matched int; v_unmatched int;
BEGIN
  WITH matches AS (
    SELECT p.id AS prereq_id, vi.id AS vcr_item_id
    FROM public.p2a_vcr_prerequisites p
    JOIN public.vcr_items vi ON vi.vcr_item = p.summary
    WHERE p.vcr_item_id IS NULL
    GROUP BY p.id, vi.id
    HAVING (SELECT COUNT(*) FROM public.vcr_items vi2 WHERE vi2.vcr_item = p.summary) = 1
  )
  UPDATE public.p2a_vcr_prerequisites p
     SET vcr_item_id = m.vcr_item_id
    FROM matches m
   WHERE p.id = m.prereq_id;

  GET DIAGNOSTICS v_matched = ROW_COUNT;

  SELECT COUNT(*) INTO v_unmatched
    FROM public.p2a_vcr_prerequisites WHERE vcr_item_id IS NULL;

  RAISE NOTICE '[E-1a backfill] vcr_item_id matched=% remaining_unmatched=% (review manually)', v_matched, v_unmatched;
END $$;


-- 2) Per-approver ledger ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.vcr_prereq_approval_status AS ENUM
    ('PENDING','ACCEPTED','REJECTED','QUALIFIED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.vcr_prerequisite_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prerequisite_id uuid NOT NULL
    REFERENCES public.p2a_vcr_prerequisites(id) ON DELETE CASCADE,
  approver_role_id uuid NOT NULL REFERENCES public.roles(id),
  approver_user_id uuid,
  status public.vcr_prereq_approval_status NOT NULL DEFAULT 'PENDING',
  decided_at timestamptz,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prerequisite_id, approver_role_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vcr_prerequisite_approvals TO authenticated;
GRANT ALL ON public.vcr_prerequisite_approvals TO service_role;
ALTER TABLE public.vcr_prerequisite_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vcr_prereq_approvals read auth"
  ON public.vcr_prerequisite_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "vcr_prereq_approvals write auth"
  ON public.vcr_prerequisite_approvals FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_vcr_prereq_approvals_prereq
  ON public.vcr_prerequisite_approvals(prerequisite_id);
CREATE INDEX IF NOT EXISTS idx_vcr_prereq_approvals_role
  ON public.vcr_prerequisite_approvals(approver_role_id);
CREATE INDEX IF NOT EXISTS idx_vcr_prereq_approvals_user
  ON public.vcr_prerequisite_approvals(approver_user_id);

CREATE TRIGGER update_vcr_prereq_approvals_updated_at
  BEFORE UPDATE ON public.vcr_prerequisite_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3) R23 fan-out function ───────────────────────────────────────────────
-- Separate from create_vcr_role_fanout (separation of concerns; testability).
CREATE OR REPLACE FUNCTION public.create_vcr_approval_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_proj_id uuid;
  v_proj_code text;
  v_vcr text;
  v_vcr_name text;
  v_handover uuid;
  v_vcr_label text;
  v_cycle int := COALESCE(NEW.cycle, 1);

  v_role_id uuid;
  v_user_id uuid;
  v_role_name text;

  v_dedupe text;
  v_task_id uuid;
  v_sub_items jsonb;
  v_total int;
BEGIN
  -- Shared guard (mirrors create_vcr_deliverable_fanout / create_vcr_role_fanout)
  IF NEW.stage <> 'VCR' OR NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN
    RETURN NEW;
  END IF;
  IF NOT public.vcr_plan_is_approved(NEW.point_id) THEN
    RETURN NEW;
  END IF;

  SELECT pl.project_id,
         COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''),
         pt.vcr_code, pt.name, pl.id
    INTO v_proj_id, v_proj_code, v_vcr, v_vcr_name, v_handover
  FROM public.p2a_handover_points pt
  JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
  JOIN public.projects pr           ON pr.id = pl.project_id
  WHERE pt.id = NEW.point_id;

  IF v_proj_id IS NULL THEN RETURN NEW; END IF;
  v_vcr_label := v_vcr || COALESCE(': '||v_vcr_name, '');

  -- Collect (prereq, approver_role) pairs from catalog with override precedence.
  -- Exclude already-closed items.
  WITH actionable AS (
    SELECT p.id AS prereq_id, p.summary, p.vcr_item_id
      FROM public.p2a_vcr_prerequisites p
     WHERE p.handover_point_id = NEW.point_id
       AND p.status NOT IN ('ACCEPTED','QUALIFICATION_APPROVED','NA')
       AND p.vcr_item_id IS NOT NULL
  ),
  resolved AS (
    SELECT a.prereq_id, a.summary, a.vcr_item_id,
           COALESCE(
             o.approving_party_role_ids_override,
             vi.approving_party_role_ids
           ) AS role_ids
      FROM actionable a
      JOIN public.vcr_items vi ON vi.id = a.vcr_item_id
      LEFT JOIN public.p2a_vcr_item_overrides o
        ON o.handover_point_id = NEW.point_id AND o.vcr_item_id = a.vcr_item_id
  ),
  expanded AS (
    SELECT prereq_id, summary, unnest(role_ids) AS role_id
      FROM resolved
     WHERE role_ids IS NOT NULL AND array_length(role_ids,1) > 0
  )
  -- For each unique role: build sub_items array, resolve user, emit one bundle.
  -- We iterate per role via cursor below.
  SELECT NULL INTO v_role_id;  -- noop; CTE above is consumed by the loop below via temp table.

  CREATE TEMP TABLE IF NOT EXISTS _e1a_expanded ON COMMIT DROP AS
    WITH actionable AS (
      SELECT p.id AS prereq_id, p.summary, p.vcr_item_id
        FROM public.p2a_vcr_prerequisites p
       WHERE p.handover_point_id = NEW.point_id
         AND p.status NOT IN ('ACCEPTED','QUALIFICATION_APPROVED','NA')
         AND p.vcr_item_id IS NOT NULL
    ),
    resolved AS (
      SELECT a.prereq_id, a.summary, a.vcr_item_id,
             COALESCE(o.approving_party_role_ids_override, vi.approving_party_role_ids) AS role_ids
        FROM actionable a
        JOIN public.vcr_items vi ON vi.id = a.vcr_item_id
        LEFT JOIN public.p2a_vcr_item_overrides o
          ON o.handover_point_id = NEW.point_id AND o.vcr_item_id = a.vcr_item_id
    )
    SELECT prereq_id, summary, unnest(role_ids) AS role_id
      FROM resolved
     WHERE role_ids IS NOT NULL AND array_length(role_ids,1) > 0;

  -- Iterate unique roles
  FOR v_role_id IN
    SELECT DISTINCT role_id FROM _e1a_expanded
  LOOP
    SELECT name INTO v_role_name FROM public.roles WHERE id = v_role_id;
    IF v_role_name IS NULL THEN CONTINUE; END IF;

    v_user_id := public.resolve_project_role_user(v_proj_id, v_role_name);
    IF v_user_id IS NULL THEN
      -- Still seed ledger PENDING rows even if user is unresolved (for visibility).
      INSERT INTO public.vcr_prerequisite_approvals (prerequisite_id, approver_role_id, status)
        SELECT prereq_id, v_role_id, 'PENDING'
          FROM _e1a_expanded WHERE role_id = v_role_id
        ON CONFLICT (prerequisite_id, approver_role_id) DO NOTHING;
      CONTINUE;
    END IF;

    v_dedupe := 'vcr_approval_bundle:'||NEW.point_id::text||':'||v_role_id::text||':'||v_cycle::text;

    -- Idempotency: skip if already created for this cycle.
    IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
      -- Still ensure ledger rows exist.
      INSERT INTO public.vcr_prerequisite_approvals (prerequisite_id, approver_role_id, approver_user_id, status)
        SELECT prereq_id, v_role_id, v_user_id, 'PENDING'
          FROM _e1a_expanded WHERE role_id = v_role_id
        ON CONFLICT (prerequisite_id, approver_role_id) DO NOTHING;
      CONTINUE;
    END IF;

    -- Build consolidated sub_items
    SELECT jsonb_agg(jsonb_build_object(
             'prerequisite_id', prereq_id,
             'summary', summary,
             'completed', false))
         , COUNT(*)
      INTO v_sub_items, v_total
      FROM _e1a_expanded
     WHERE role_id = v_role_id;

    INSERT INTO public.user_tasks (
      user_id, title, description, type, status, priority,
      dedupe_key, sub_items, progress_percentage, metadata
    ) VALUES (
      v_user_id,
      'VCR Review Items – '||v_vcr_label,
      'Review and approve '||v_total||' checklist item(s) for '||v_vcr_label||
        '. Verify evidence and accept or raise qualifications.',
      'vcr_approval_bundle','waiting','Medium',
      v_dedupe, v_sub_items, 0,
      jsonb_build_object(
        'source','vcr_execution_plan_approval',
        'contract','spec_v2',
        'project_id', v_proj_id,
        'project_code', v_proj_code,
        'plan_id', v_handover,
        'point_id', NEW.point_id,
        'vcr_id', NEW.point_id,
        'vcr_code', v_vcr,
        'vcr_label', v_vcr_label,
        'approving_party_role_id', v_role_id,
        'role_name', v_role_name,
        'cycle', v_cycle,
        'total_items', v_total,
        'completed_items', 0,
        'items_ready_for_review', 0,
        'action','review_vcr_checklist_bundle'
      )
    ) RETURNING id INTO v_task_id;

    -- Seed PENDING ledger rows for this role.
    INSERT INTO public.vcr_prerequisite_approvals (prerequisite_id, approver_role_id, approver_user_id, status)
      SELECT prereq_id, v_role_id, v_user_id, 'PENDING'
        FROM _e1a_expanded WHERE role_id = v_role_id
      ON CONFLICT (prerequisite_id, approver_role_id) DO UPDATE
        SET approver_user_id = EXCLUDED.approver_user_id;
  END LOOP;

  DROP TABLE IF EXISTS _e1a_expanded;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_create_vcr_approval_fanout ON public.p2a_handover_approvers;
CREATE TRIGGER trg_create_vcr_approval_fanout
AFTER UPDATE ON public.p2a_handover_approvers
FOR EACH ROW EXECUTE FUNCTION public.create_vcr_approval_fanout();


-- 4) Revision reconcile RPC ─────────────────────────────────────────────
-- Supersede-not-delete: when approving roles change on a revision, ADD new
-- bundles, mark removed ones as cancelled_superseded, KEEP unchanged.
CREATE OR REPLACE FUNCTION public.reconcile_vcr_approval_bundles(p_point_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_proj_id uuid; v_cycle int;
  v_added int := 0; v_superseded int := 0; v_kept int := 0;
  v_current_roles uuid[];
  v_existing record;
BEGIN
  SELECT pl.project_id INTO v_proj_id
    FROM public.p2a_handover_points pt
    JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
   WHERE pt.id = p_point_id;
  IF v_proj_id IS NULL THEN
    RETURN jsonb_build_object('error','point_not_found');
  END IF;

  -- Current desired role set (union across all actionable prereqs, override-aware).
  SELECT COALESCE(array_agg(DISTINCT rid) FILTER (WHERE rid IS NOT NULL), ARRAY[]::uuid[])
    INTO v_current_roles
    FROM (
      SELECT unnest(COALESCE(o.approving_party_role_ids_override, vi.approving_party_role_ids)) AS rid
        FROM public.p2a_vcr_prerequisites p
        JOIN public.vcr_items vi ON vi.id = p.vcr_item_id
        LEFT JOIN public.p2a_vcr_item_overrides o
          ON o.handover_point_id = p_point_id AND o.vcr_item_id = p.vcr_item_id
       WHERE p.handover_point_id = p_point_id
         AND p.status NOT IN ('ACCEPTED','QUALIFICATION_APPROVED','NA')
         AND p.vcr_item_id IS NOT NULL
    ) x;

  -- Most recent cycle for this VCR.
  SELECT COALESCE(MAX(cycle),1) INTO v_cycle
    FROM public.p2a_handover_approvers
   WHERE point_id = p_point_id AND stage = 'VCR';

  -- SUPERSEDE: existing live bundles whose role is no longer in desired set.
  FOR v_existing IN
    SELECT id, (metadata->>'approving_party_role_id')::uuid AS role_id
      FROM public.user_tasks
     WHERE type = 'vcr_approval_bundle'
       AND status NOT IN ('completed','cancelled','cancelled_superseded')
       AND (metadata->>'point_id')::uuid = p_point_id
  LOOP
    IF NOT (v_existing.role_id = ANY(v_current_roles)) THEN
      UPDATE public.user_tasks
         SET status = 'cancelled_superseded', updated_at = now()
       WHERE id = v_existing.id;
      v_superseded := v_superseded + 1;
    ELSE
      v_kept := v_kept + 1;
    END IF;
  END LOOP;

  -- ADD: roles in desired set without a live bundle (re-run fan-out manually
  -- by faking an approver-row UPDATE would be heavy; instead emit synthetic
  -- bundles here using the same shape as R23).
  DECLARE
    v_role_id uuid; v_user_id uuid; v_role_name text;
    v_dedupe text; v_proj_code text; v_vcr text; v_vcr_name text;
    v_vcr_label text; v_handover uuid;
    v_sub_items jsonb; v_total int;
  BEGIN
    SELECT pl.project_id,
           COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''),
           pt.vcr_code, pt.name, pl.id
      INTO v_proj_id, v_proj_code, v_vcr, v_vcr_name, v_handover
    FROM public.p2a_handover_points pt
    JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
    JOIN public.projects pr           ON pr.id = pl.project_id
    WHERE pt.id = p_point_id;
    v_vcr_label := v_vcr || COALESCE(': '||v_vcr_name, '');

    FOREACH v_role_id IN ARRAY v_current_roles LOOP
      -- Already live? skip.
      IF EXISTS (
        SELECT 1 FROM public.user_tasks
         WHERE type='vcr_approval_bundle'
           AND status NOT IN ('completed','cancelled','cancelled_superseded')
           AND (metadata->>'point_id')::uuid = p_point_id
           AND (metadata->>'approving_party_role_id')::uuid = v_role_id
      ) THEN CONTINUE; END IF;

      SELECT name INTO v_role_name FROM public.roles WHERE id = v_role_id;
      IF v_role_name IS NULL THEN CONTINUE; END IF;

      v_user_id := public.resolve_project_role_user(v_proj_id, v_role_name);
      IF v_user_id IS NULL THEN CONTINUE; END IF;

      v_dedupe := 'vcr_approval_bundle:'||p_point_id::text||':'||v_role_id::text||':'||v_cycle::text||':r'||(v_added+1)::text;

      SELECT jsonb_agg(jsonb_build_object(
               'prerequisite_id', p.id,
               'summary', p.summary,
               'completed', false)),
             COUNT(*)
        INTO v_sub_items, v_total
        FROM public.p2a_vcr_prerequisites p
        JOIN public.vcr_items vi ON vi.id = p.vcr_item_id
        LEFT JOIN public.p2a_vcr_item_overrides o
          ON o.handover_point_id = p_point_id AND o.vcr_item_id = p.vcr_item_id
       WHERE p.handover_point_id = p_point_id
         AND p.status NOT IN ('ACCEPTED','QUALIFICATION_APPROVED','NA')
         AND v_role_id = ANY(COALESCE(o.approving_party_role_ids_override, vi.approving_party_role_ids));

      IF v_total IS NULL OR v_total = 0 THEN CONTINUE; END IF;

      INSERT INTO public.user_tasks (
        user_id, title, description, type, status, priority,
        dedupe_key, sub_items, progress_percentage, metadata
      ) VALUES (
        v_user_id,
        'VCR Review Items – '||v_vcr_label,
        'Review and approve '||v_total||' checklist item(s) for '||v_vcr_label,
        'vcr_approval_bundle','waiting','Medium',
        v_dedupe, v_sub_items, 0,
        jsonb_build_object(
          'source','vcr_execution_plan_approval',
          'contract','spec_v2',
          'project_id', v_proj_id,
          'project_code', v_proj_code,
          'plan_id', v_handover,
          'point_id', p_point_id,
          'vcr_id', p_point_id,
          'vcr_code', v_vcr,
          'vcr_label', v_vcr_label,
          'approving_party_role_id', v_role_id,
          'role_name', v_role_name,
          'cycle', v_cycle,
          'total_items', v_total,
          'completed_items', 0,
          'items_ready_for_review', 0,
          'action','review_vcr_checklist_bundle',
          'reconciled', true
        )
      );

      INSERT INTO public.vcr_prerequisite_approvals (prerequisite_id, approver_role_id, approver_user_id, status)
        SELECT p.id, v_role_id, v_user_id, 'PENDING'
          FROM public.p2a_vcr_prerequisites p
          JOIN public.vcr_items vi ON vi.id = p.vcr_item_id
          LEFT JOIN public.p2a_vcr_item_overrides o
            ON o.handover_point_id = p_point_id AND o.vcr_item_id = p.vcr_item_id
         WHERE p.handover_point_id = p_point_id
           AND p.status NOT IN ('ACCEPTED','QUALIFICATION_APPROVED','NA')
           AND v_role_id = ANY(COALESCE(o.approving_party_role_ids_override, vi.approving_party_role_ids))
        ON CONFLICT (prerequisite_id, approver_role_id) DO NOTHING;

      v_added := v_added + 1;
    END LOOP;
  END;

  RETURN jsonb_build_object(
    'added', v_added,
    'superseded', v_superseded,
    'kept', v_kept,
    'desired_role_count', COALESCE(array_length(v_current_roles,1),0)
  );
END
$fn$;

GRANT EXECUTE ON FUNCTION public.reconcile_vcr_approval_bundles(uuid) TO authenticated, service_role;
