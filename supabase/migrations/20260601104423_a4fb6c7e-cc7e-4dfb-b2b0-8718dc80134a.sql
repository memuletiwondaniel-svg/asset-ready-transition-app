-- M6: Idempotency dedupe key on user_tasks
-- Additive only. Partial UNIQUE index so legacy NULL rows are unaffected.

ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS dedupe_key text;

-- Partial UNIQUE index. Only rows with a non-null dedupe_key participate in uniqueness.
-- This lets manually-created tasks (no dedupe_key) coexist freely with generator-produced tasks.
CREATE UNIQUE INDEX IF NOT EXISTS user_tasks_dedupe_key_unique_idx
  ON public.user_tasks (dedupe_key)
  WHERE dedupe_key IS NOT NULL;