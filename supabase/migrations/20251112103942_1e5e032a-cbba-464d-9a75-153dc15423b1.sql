-- Create ORM notification preferences table
CREATE TABLE IF NOT EXISTS public.orm_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (digest_frequency IN ('daily', 'weekly', 'never')),
  include_pending_reviews BOOLEAN DEFAULT true,
  include_overdue_tasks BOOLEAN DEFAULT true,
  include_milestone_progress BOOLEAN DEFAULT true,
  digest_time TIME DEFAULT '09:00:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.orm_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own ORM notification preferences"
  ON public.orm_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ORM notification preferences"
  ON public.orm_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ORM notification preferences"
  ON public.orm_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_orm_notification_preferences_user_id ON public.orm_notification_preferences(user_id);
CREATE INDEX idx_orm_notification_preferences_frequency ON public.orm_notification_preferences(digest_frequency) WHERE digest_frequency != 'never';

-- Create trigger for updated_at
CREATE TRIGGER update_orm_notification_preferences_updated_at
  BEFORE UPDATE ON public.orm_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();