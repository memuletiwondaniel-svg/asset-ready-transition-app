-- Per-user AI memory table for personalization
CREATE TABLE public.ai_user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_key TEXT NOT NULL,
  context_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, context_key)
);

ALTER TABLE public.ai_user_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own context"
ON public.ai_user_context FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_ai_user_context_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_user_context_updated
BEFORE UPDATE ON public.ai_user_context
FOR EACH ROW EXECUTE FUNCTION update_ai_user_context_timestamp();

-- Prompt improvement suggestions table for the training loop
CREATE TABLE public.ai_prompt_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code TEXT NOT NULL DEFAULT 'bob-copilot',
  current_prompt_hash TEXT,
  suggested_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  feedback_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);

ALTER TABLE public.ai_prompt_improvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view prompt improvements"
ON public.ai_prompt_improvements FOR SELECT
TO authenticated
USING (true);