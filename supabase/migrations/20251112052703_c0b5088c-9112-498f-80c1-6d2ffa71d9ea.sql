-- Add display_order column to user_tasks for manual prioritization
ALTER TABLE user_tasks 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create task_dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES user_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES user_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id),
  CONSTRAINT unique_dependency UNIQUE (task_id, depends_on_task_id)
);

-- Enable RLS on task_dependencies
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Create policies for task_dependencies
CREATE POLICY "Users can view their task dependencies"
  ON task_dependencies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tasks
      WHERE user_tasks.id = task_dependencies.task_id
      AND user_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create task dependencies"
  ON task_dependencies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tasks
      WHERE user_tasks.id = task_dependencies.task_id
      AND user_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their task dependencies"
  ON task_dependencies
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_tasks
      WHERE user_tasks.id = task_dependencies.task_id
      AND user_tasks.user_id = auth.uid()
    )
  );

-- Enable realtime for task_dependencies
ALTER TABLE task_dependencies REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE task_dependencies;