-- Migration 4b: source_business_key + 3 UNIQUE indexes + cleanup of 2 blank ORA drafts + back-fill
-- Single transaction; aborts on any safety-check failure.
-- NOTE: source_plan_table is the PLAN-level table (per existing CHECK constraint from M7):
--       allowed values are orp_plans / p2a_handover_plans / p2a_handover_points.
--       source_business_key identifies the item WITHIN that plan.

-- 1) Safety pre-check: the 2 known blank ORA draft rows must still be orphans.
DO $$
DECLARE v_unsafe INT;
BEGIN
  SELECT COUNT(*) INTO v_unsafe
  FROM ora_plan_activities opa
  WHERE (opa.activity_code IS NULL OR opa.activity_code = '')
    AND (opa.task_id IS NOT NULL
         OR EXISTS (SELECT 1 FROM ora_plan_activities c WHERE c.parent_id = opa.id));
  IF v_unsafe > 0 THEN
    RAISE EXCEPTION 'Aborting 4b: % blank ora_plan_activities row(s) now have task_id or children', v_unsafe;
  END IF;
END $$;

-- 2) Delete the 2 abandoned blank ORA draft rows.
DELETE FROM ora_plan_activities WHERE activity_code IS NULL OR activity_code = '';

-- 3) Additive column.
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS source_business_key TEXT;
COMMENT ON COLUMN public.user_tasks.source_business_key IS
  'Durable business key of the plan ITEM that generated this task (e.g. activity_code, vcr_code). Survives P2A/VCR wipe-and-recreate. M8 diff key.';

-- 4) Back-fill. ORA activities (8): plan=orp_plans, key=activity_code.
UPDATE public.user_tasks
SET source_plan_table   = 'orp_plans',
    source_plan_id      = NULLIF(metadata->>'plan_id','')::uuid,
    source_business_key = NULLIF(metadata->>'activity_code','')
WHERE type = 'ora_activity'
  AND source_business_key IS NULL
  AND metadata ? 'plan_id' AND metadata ? 'activity_code';

-- VCR delivery plan tasks (5): plan=p2a_handover_plans, key=vcr_code.
UPDATE public.user_tasks
SET source_plan_table   = 'p2a_handover_plans',
    source_plan_id      = NULLIF(metadata->>'plan_id','')::uuid,
    source_business_key = NULLIF(metadata->>'vcr_code','')
WHERE type = 'vcr_delivery_plan'
  AND source_business_key IS NULL
  AND metadata ? 'plan_id' AND metadata ? 'vcr_code';

-- 5) Coverage gate.
DO $$
DECLARE v_ora INT; v_vcr INT; v_ora_t INT; v_vcr_t INT;
BEGIN
  SELECT COUNT(*) INTO v_ora_t FROM user_tasks WHERE type='ora_activity';
  SELECT COUNT(*) INTO v_vcr_t FROM user_tasks WHERE type='vcr_delivery_plan';
  SELECT COUNT(*) INTO v_ora   FROM user_tasks WHERE type='ora_activity'      AND source_business_key IS NOT NULL;
  SELECT COUNT(*) INTO v_vcr   FROM user_tasks WHERE type='vcr_delivery_plan' AND source_business_key IS NOT NULL;
  IF v_ora <> v_ora_t THEN RAISE EXCEPTION 'Back-fill incomplete: ora_activity %/%', v_ora, v_ora_t; END IF;
  IF v_vcr <> v_vcr_t THEN RAISE EXCEPTION 'Back-fill incomplete: vcr_delivery_plan %/%', v_vcr, v_vcr_t; END IF;
END $$;

-- 6) UNIQUE indexes.
CREATE UNIQUE INDEX IF NOT EXISTS ora_plan_activities_plan_code_unique_idx
  ON public.ora_plan_activities (orp_plan_id, activity_code);
CREATE UNIQUE INDEX IF NOT EXISTS p2a_handover_points_plan_vcr_unique_idx
  ON public.p2a_handover_points (handover_plan_id, vcr_code);
CREATE UNIQUE INDEX IF NOT EXISTS p2a_vcr_prerequisites_point_prereq_unique_idx
  ON public.p2a_vcr_prerequisites (handover_point_id, pac_prerequisite_id);