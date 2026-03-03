
-- Check and update the status constraint on personal_backlog to allow 'in_progress'
ALTER TABLE public.personal_backlog DROP CONSTRAINT IF EXISTS personal_backlog_status_check;
ALTER TABLE public.personal_backlog ADD CONSTRAINT personal_backlog_status_check 
  CHECK (status IN ('pending', 'in_progress', 'done'));
