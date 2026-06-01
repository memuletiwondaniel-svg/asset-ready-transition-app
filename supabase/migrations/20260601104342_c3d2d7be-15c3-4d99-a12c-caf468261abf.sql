-- M7: Plan versioning + task provenance
-- Additive only. No RLS changes (existing policies cover new columns).
-- No GRANT changes (no new tables).

ALTER TABLE public.orp_plans
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.p2a_handover_plans
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.p2a_handover_points
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS source_plan_table text,
  ADD COLUMN IF NOT EXISTS source_plan_id uuid,
  ADD COLUMN IF NOT EXISTS source_plan_version integer;

-- Defensive: restrict source_plan_table to the three valid values when set.
-- (NULL allowed for legacy tasks and tasks not generated from a plan.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_tasks_source_plan_table_check'
  ) THEN
    ALTER TABLE public.user_tasks
      ADD CONSTRAINT user_tasks_source_plan_table_check
      CHECK (source_plan_table IS NULL OR source_plan_table IN ('orp_plans','p2a_handover_plans','p2a_handover_points'));
  END IF;
END$$;

-- Helpful index for "find all tasks for this plan version" lookups used by reconciliation and the M11 harness.
CREATE INDEX IF NOT EXISTS user_tasks_source_plan_idx
  ON public.user_tasks (source_plan_table, source_plan_id, source_plan_version)
  WHERE source_plan_table IS NOT NULL;