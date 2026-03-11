-- Performance indexes for My Tasks page queries
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_status ON public.user_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_type ON public.user_tasks(user_id, type);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON public.task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_outstanding_work_items_assigned ON public.outstanding_work_items(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_orp_resources_user ON public.orp_resources(user_id);