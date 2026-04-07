
CREATE TABLE public.agent_training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_code TEXT NOT NULL,
  user_id UUID NOT NULL,
  document_name TEXT,
  document_description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  key_learnings TEXT,
  transcript JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.agent_training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own training sessions"
  ON public.agent_training_sessions FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own training sessions"
  ON public.agent_training_sessions FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own training sessions"
  ON public.agent_training_sessions FOR UPDATE
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own training sessions"
  ON public.agent_training_sessions FOR DELETE
  USING ((select auth.uid()) = user_id);

CREATE INDEX idx_agent_training_sessions_agent ON public.agent_training_sessions(agent_code);
CREATE INDEX idx_agent_training_sessions_user ON public.agent_training_sessions(user_id);
CREATE INDEX idx_agent_training_sessions_status ON public.agent_training_sessions(status);

CREATE TRIGGER update_agent_training_sessions_updated_at
  BEFORE UPDATE ON public.agent_training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
