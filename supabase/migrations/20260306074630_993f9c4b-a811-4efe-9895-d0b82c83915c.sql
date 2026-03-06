CREATE OR REPLACE FUNCTION public.create_user_task(
  p_user_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_type text DEFAULT 'task',
  p_status text DEFAULT 'pending',
  p_priority text DEFAULT 'medium',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_due_date timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task_id uuid;
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE user_id = p_user_id;

  INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, metadata, due_date, tenant_id)
  VALUES (p_user_id, p_title, p_description, p_type, p_status, p_priority, p_metadata, p_due_date, v_tenant_id)
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$;