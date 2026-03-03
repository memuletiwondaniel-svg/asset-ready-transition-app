
ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_status_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'waiting'));
