
CREATE TABLE public.project_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_drafts TO authenticated;
GRANT ALL ON public.project_drafts TO service_role;

ALTER TABLE public.project_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own drafts"
ON public.project_drafts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users create their own drafts"
ON public.project_drafts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own drafts"
ON public.project_drafts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own drafts"
ON public.project_drafts FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_project_drafts_user ON public.project_drafts(user_id, updated_at DESC);

CREATE TRIGGER update_project_drafts_updated_at
BEFORE UPDATE ON public.project_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
