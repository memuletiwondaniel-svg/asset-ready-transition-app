-- Create ORM notifications table
CREATE TABLE IF NOT EXISTS public.orm_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('PENDING_REVIEW', 'OVERDUE_TASK', 'MILESTONE_UPDATE', 'WORKFLOW_CHANGE', 'COMMENT_ADDED', 'TASK_ASSIGNED')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('deliverable', 'task', 'milestone', 'plan')),
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orm_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own ORM notifications"
  ON public.orm_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own ORM notifications"
  ON public.orm_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create ORM notifications"
  ON public.orm_notifications
  FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_orm_notifications_user_id ON public.orm_notifications(user_id);
CREATE INDEX idx_orm_notifications_is_read ON public.orm_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_orm_notifications_created_at ON public.orm_notifications(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orm_notifications;

-- Set up pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily digest at 9 AM (runs every day at 9:00 AM)
SELECT cron.schedule(
  'orm-daily-digest',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/send-orm-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbnJqcWpib251dnB4eGZ2ZmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODgwMjgsImV4cCI6MjA2ODY2NDAyOH0.tj1l_8eFDnHvAJKxEEHjQMid8l9vGG0mNIFlK6b6HKM"}'::jsonb,
    body := '{"frequency": "daily"}'::jsonb
  ) as request_id;
  $$
);

-- Schedule weekly digest every Monday at 9 AM
SELECT cron.schedule(
  'orm-weekly-digest',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/send-orm-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbnJqcWpib251dnB4eGZ2ZmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODgwMjgsImV4cCI6MjA2ODY2NDAyOH0.tj1l_8eFDnHvAJKxEEHjQMid8l9vGG0mNIFlK6b6HKM"}'::jsonb,
    body := '{"frequency": "weekly"}'::jsonb
  ) as request_id;
  $$
);