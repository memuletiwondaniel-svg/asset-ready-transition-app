-- =====================================================================
-- Migration 5 — is_active_task_status + is_child_task_complete +
--               trg_rollup_completion + ora_activity_plan_v
-- =====================================================================

-- 1) Expand status CHECK to permit 'cancelled_superseded' (used by M8 diff).
ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_status_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_status_check
  CHECK (status = ANY (ARRAY[
    'pending','in_progress','completed','cancelled','cancelled_superseded','waiting'
  ]));

-- 2) Active-status helper. Single source of truth for "excluded from rollups / hidden in surfaces".
CREATE OR REPLACE FUNCTION public.is_active_task_status(_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _status IS NOT NULL
     AND _status <> 'cancelled'
     AND _status <> 'cancelled_superseded'
$$;

-- 3) Type-aware child-completion helper.
--    ITP sub-tasks (metadata.requires_sr_ora_confirmation = 'true') only count
--    complete when confirmed_by_sr_ora_engr = true (Rule 22b — Commissioning Lead
--    submit alone does NOT count). Everything else uses status = 'completed'.
CREATE OR REPLACE FUNCTION public.is_child_task_complete(
  _status text,
  _type text,
  _metadata jsonb,
  _confirmed_by_sr_ora_engr boolean
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(_metadata->>'requires_sr_ora_confirmation','false') = 'true'
      THEN COALESCE(_confirmed_by_sr_ora_engr, false) = true
    ELSE _status = 'completed'
  END
$$;

-- 4) Rollup trigger. Recomputes parent.progress_percentage from active children only.
--    SECURITY DEFINER so it can write through RLS for the rollup write only.
CREATE OR REPLACE FUNCTION public.trg_rollup_completion_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parents uuid[] := ARRAY[]::uuid[];
  v_pid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_task_id IS NOT NULL THEN
      v_parents := array_append(v_parents, NEW.parent_task_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.parent_task_id IS NOT NULL THEN
      v_parents := array_append(v_parents, NEW.parent_task_id);
    END IF;
    IF OLD.parent_task_id IS NOT NULL
       AND OLD.parent_task_id IS DISTINCT FROM NEW.parent_task_id THEN
      v_parents := array_append(v_parents, OLD.parent_task_id);
    END IF;
  END IF;

  IF array_length(v_parents, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  FOREACH v_pid IN ARRAY v_parents LOOP
    UPDATE public.user_tasks p
    SET progress_percentage = sub.pct,
        updated_at = now()
    FROM (
      WITH children AS (
        SELECT c.status, c.type, c.metadata, c.confirmed_by_sr_ora_engr
        FROM public.user_tasks c
        WHERE c.parent_task_id = v_pid
      ),
      agg AS (
        SELECT
          COUNT(*) FILTER (WHERE public.is_active_task_status(status)) AS denom,
          COUNT(*) FILTER (
            WHERE public.is_active_task_status(status)
              AND public.is_child_task_complete(status, type, metadata, confirmed_by_sr_ora_engr)
          ) AS num
        FROM children
      )
      SELECT CASE WHEN denom = 0 THEN 0
                  ELSE floor((100.0 * num) / denom)::int END AS pct
      FROM agg
    ) sub
    WHERE p.id = v_pid;
  END LOOP;

  RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS trg_rollup_completion ON public.user_tasks;
CREATE TRIGGER trg_rollup_completion
  AFTER INSERT OR UPDATE OF status, confirmed_by_sr_ora_engr, parent_task_id, metadata, type
  ON public.user_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_rollup_completion_fn();

-- 5) Canonical view: ora_activity_plan_v. Hides cancelled + cancelled_superseded.
--    security_invoker = true → inherits the querying user's RLS (no privilege escalation,
--    no Security Definer View linter finding).
DROP VIEW IF EXISTS public.ora_activity_plan_v;
CREATE VIEW public.ora_activity_plan_v
WITH (security_invoker = true)
AS
SELECT
  id, user_id, title, description, due_date, priority, type, status,
  metadata, display_order, progress_percentage, sub_items,
  parent_task_id, confirmed_by_sr_ora_engr, confirmed_at,
  source_plan_table, source_plan_id, source_plan_version, source_business_key,
  dedupe_key, tenant_id, created_at, updated_at
FROM public.user_tasks
WHERE public.is_active_task_status(status);

GRANT SELECT ON public.ora_activity_plan_v TO authenticated;
GRANT ALL    ON public.ora_activity_plan_v TO service_role;

COMMENT ON VIEW public.ora_activity_plan_v IS
  'Canonical active-tasks view. Excludes cancelled and cancelled_superseded via is_active_task_status(). All read surfaces (Activity List, Gantt, My Tasks) bind to this view.';

-- 6) Worked-example demonstration (Sr Dev hold #1).
--    Asserts: cancelled_superseded excluded from denominator; ITP not-yet-confirmed
--    does NOT count complete; trigger fires on INSERT and UPDATE.
DO $$
DECLARE
  v_user uuid;
  v_tenant uuid;
  v_parent uuid;
  v_c1 uuid; v_c2 uuid; v_c3 uuid; v_c4 uuid; v_c5 uuid;
  v_pct int;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;
  SELECT tenant_id INTO v_tenant FROM public.user_tasks WHERE tenant_id IS NOT NULL LIMIT 1;

  IF v_user IS NULL OR v_tenant IS NULL THEN
    RAISE NOTICE 'Demo skipped — no auth user or tenant available for fixtures.';
    RETURN;
  END IF;

  -- Parent (no parent_task_id)
  INSERT INTO public.user_tasks (user_id, tenant_id, title, type, status, priority, progress_percentage)
  VALUES (v_user, v_tenant, '__m5_demo_parent__', 'task', 'in_progress', 'Low', 0)
  RETURNING id INTO v_parent;

  -- 5 children. Insert all as pending first; trigger should establish denominator.
  INSERT INTO public.user_tasks (user_id, tenant_id, title, type, status, priority, parent_task_id, metadata)
  VALUES (v_user, v_tenant, '__m5_demo_c1_regular__',    'task', 'pending',  'Low', v_parent, '{}'::jsonb)
  RETURNING id INTO v_c1;

  INSERT INTO public.user_tasks (user_id, tenant_id, title, type, status, priority, parent_task_id, metadata)
  VALUES (v_user, v_tenant, '__m5_demo_c2_completed__',  'task', 'completed','Low', v_parent, '{}'::jsonb)
  RETURNING id INTO v_c2;

  INSERT INTO public.user_tasks (user_id, tenant_id, title, type, status, priority, parent_task_id, metadata, confirmed_by_sr_ora_engr)
  VALUES (v_user, v_tenant, '__m5_demo_c3_itp_unconfirmed__', 'task', 'completed','Low', v_parent,
          '{"requires_sr_ora_confirmation":"true"}'::jsonb, false)
  RETURNING id INTO v_c3;

  INSERT INTO public.user_tasks (user_id, tenant_id, title, type, status, priority, parent_task_id, metadata, confirmed_by_sr_ora_engr, confirmed_at)
  VALUES (v_user, v_tenant, '__m5_demo_c4_itp_confirmed__',   'task', 'in_progress','Low', v_parent,
          '{"requires_sr_ora_confirmation":"true"}'::jsonb, true, now())
  RETURNING id INTO v_c4;

  INSERT INTO public.user_tasks (user_id, tenant_id, title, type, status, priority, parent_task_id, metadata)
  VALUES (v_user, v_tenant, '__m5_demo_c5_superseded__', 'task', 'cancelled_superseded', 'Low', v_parent, '{}'::jsonb)
  RETURNING id INTO v_c5;

  -- Expected after INSERTs:
  -- denom = 4 (c1,c2,c3,c4; c5 excluded as cancelled_superseded)
  -- num   = 2 (c2 completed; c4 ITP confirmed; c3 ITP unconfirmed does NOT count)
  -- pct   = floor(100 * 2/4) = 50
  SELECT progress_percentage INTO v_pct FROM public.user_tasks WHERE id = v_parent;
  IF v_pct <> 50 THEN
    RAISE EXCEPTION 'M5 demo failed @ post-INSERT: expected pct=50 (denom=4, num=2), got %', v_pct;
  END IF;
  RAISE NOTICE 'M5 demo OK @ post-INSERT: pct=% (denom=4, num=2, c5 cancelled_superseded excluded, c3 ITP unconfirmed not counted)', v_pct;

  -- UPDATE: confirm the ITP-unconfirmed child → numerator should rise from 2 to 3.
  UPDATE public.user_tasks
  SET confirmed_by_sr_ora_engr = true, confirmed_at = now()
  WHERE id = v_c3;

  SELECT progress_percentage INTO v_pct FROM public.user_tasks WHERE id = v_parent;
  IF v_pct <> 75 THEN
    RAISE EXCEPTION 'M5 demo failed @ post-confirm: expected pct=75 (denom=4, num=3), got %', v_pct;
  END IF;
  RAISE NOTICE 'M5 demo OK @ post-confirm: pct=% (ITP confirmation flipped c3 to complete)', v_pct;

  -- UPDATE: supersede c1 → denominator drops to 3.
  UPDATE public.user_tasks SET status = 'cancelled_superseded' WHERE id = v_c1;
  SELECT progress_percentage INTO v_pct FROM public.user_tasks WHERE id = v_parent;
  -- denom=3 (c2,c3,c4), num=3 (all complete) → pct=100
  IF v_pct <> 100 THEN
    RAISE EXCEPTION 'M5 demo failed @ post-supersede: expected pct=100 (denom=3, num=3), got %', v_pct;
  END IF;
  RAISE NOTICE 'M5 demo OK @ post-supersede: pct=% (denom dropped to 3 — cancelled_superseded excluded)', v_pct;

  -- Cleanup (children first to satisfy FK)
  DELETE FROM public.user_tasks WHERE parent_task_id = v_parent;
  DELETE FROM public.user_tasks WHERE id = v_parent;
  RAISE NOTICE 'M5 demo cleanup complete.';
END
$$;