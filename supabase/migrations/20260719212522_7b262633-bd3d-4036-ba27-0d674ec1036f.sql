ALTER FUNCTION public._is_task_terminal(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_user_task_due_date(uuid) SET search_path = public, pg_temp;