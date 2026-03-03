
-- Create personal_backlog table
CREATE TABLE public.personal_backlog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_backlog ENABLE ROW LEVEL SECURITY;

-- Users can only see their own items
CREATE POLICY "Users can view own backlog" ON public.personal_backlog
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backlog" ON public.personal_backlog
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own backlog" ON public.personal_backlog
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own backlog" ON public.personal_backlog
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast user queries
CREATE INDEX idx_personal_backlog_user_id ON public.personal_backlog(user_id, status, sort_order);

-- Auto-update updated_at
CREATE TRIGGER update_personal_backlog_updated_at
  BEFORE UPDATE ON public.personal_backlog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_projects_updated_at();
