-- M9 schema: parent linkage + Sr ORA Engr confirmation flags
-- Additive only. Trigger + view come in migration 5.

ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid,
  ADD COLUMN IF NOT EXISTS confirmed_by_sr_ora_engr boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- Self-referencing FK with cascade. Wrapped in DO block so re-runs don't fail.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_tasks_parent_task_id_fkey'
  ) THEN
    ALTER TABLE public.user_tasks
      ADD CONSTRAINT user_tasks_parent_task_id_fkey
      FOREIGN KEY (parent_task_id)
      REFERENCES public.user_tasks(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Index for the rollup trigger's "find my siblings" lookups.
CREATE INDEX IF NOT EXISTS user_tasks_parent_task_id_idx
  ON public.user_tasks (parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- Consistency: confirmed_at must be set iff confirmed_by_sr_ora_engr is true.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_tasks_confirmation_consistency_check'
  ) THEN
    ALTER TABLE public.user_tasks
      ADD CONSTRAINT user_tasks_confirmation_consistency_check
      CHECK (
        (confirmed_by_sr_ora_engr = false AND confirmed_at IS NULL)
        OR
        (confirmed_by_sr_ora_engr = true AND confirmed_at IS NOT NULL)
      );
  END IF;
END$$;