-- Create ORP deliverable comments table
CREATE TABLE IF NOT EXISTS public.orp_deliverable_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_deliverable_id UUID NOT NULL REFERENCES public.orp_plan_deliverables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  parent_comment_id UUID REFERENCES public.orp_deliverable_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX idx_orp_comments_deliverable ON public.orp_deliverable_comments(plan_deliverable_id);
CREATE INDEX idx_orp_comments_user ON public.orp_deliverable_comments(user_id);
CREATE INDEX idx_orp_comments_parent ON public.orp_deliverable_comments(parent_comment_id);

-- Create ORP comment attachments table
CREATE TABLE IF NOT EXISTS public.orp_comment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.orp_deliverable_comments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for attachments
CREATE INDEX idx_orp_comment_attachments_comment ON public.orp_comment_attachments(comment_id);

-- Enable RLS
ALTER TABLE public.orp_deliverable_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orp_comment_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for comments
CREATE POLICY "Users can view comments on their ORPs"
  ON public.orp_deliverable_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orp_plan_deliverables pd
      JOIN public.orp_plans p ON p.id = pd.orp_plan_id
      WHERE pd.id = plan_deliverable_id
      AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid() OR user_is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can create comments on their ORPs"
  ON public.orp_deliverable_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.orp_plan_deliverables pd
      JOIN public.orp_plans p ON p.id = pd.orp_plan_id
      WHERE pd.id = plan_deliverable_id
      AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.orp_deliverable_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.orp_deliverable_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for attachments
CREATE POLICY "Users can view attachments on their ORPs"
  ON public.orp_comment_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orp_deliverable_comments c
      JOIN public.orp_plan_deliverables pd ON pd.id = c.plan_deliverable_id
      JOIN public.orp_plans p ON p.id = pd.orp_plan_id
      WHERE c.id = comment_id
      AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid() OR user_is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can upload attachments to their ORPs"
  ON public.orp_comment_attachments FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.orp_deliverable_comments c
      JOIN public.orp_plan_deliverables pd ON pd.id = c.plan_deliverable_id
      JOIN public.orp_plans p ON p.id = pd.orp_plan_id
      WHERE c.id = comment_id
      AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON public.orp_comment_attachments FOR DELETE
  USING (auth.uid() = uploaded_by);

-- Trigger for updated_at
CREATE TRIGGER update_orp_comments_updated_at
  BEFORE UPDATE ON public.orp_deliverable_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.orp_deliverable_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orp_comment_attachments;

-- Set replica identity for realtime
ALTER TABLE public.orp_deliverable_comments REPLICA IDENTITY FULL;
ALTER TABLE public.orp_comment_attachments REPLICA IDENTITY FULL;