
-- Annotation type enum
CREATE TYPE public.annotation_type AS ENUM ('highlight', 'comment_pin', 'text_box', 'drawing', 'stamp');

-- Attachment annotations table
CREATE TABLE public.attachment_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attachment_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annotation_type public.annotation_type NOT NULL,
  page_number INT DEFAULT 1,
  position_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  content TEXT DEFAULT '',
  color TEXT DEFAULT '#FFEB3B',
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Annotation replies table
CREATE TABLE public.annotation_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annotation_id UUID NOT NULL REFERENCES public.attachment_annotations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_attachment_annotations_attachment ON public.attachment_annotations(attachment_id);
CREATE INDEX idx_attachment_annotations_user ON public.attachment_annotations(user_id);
CREATE INDEX idx_annotation_replies_annotation ON public.annotation_replies(annotation_id);

-- Enable RLS
ALTER TABLE public.attachment_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotation_replies ENABLE ROW LEVEL SECURITY;

-- RLS policies for attachment_annotations
CREATE POLICY "Authenticated users can view annotations"
  ON public.attachment_annotations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create annotations"
  ON public.attachment_annotations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations"
  ON public.attachment_annotations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations"
  ON public.attachment_annotations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for annotation_replies
CREATE POLICY "Authenticated users can view replies"
  ON public.annotation_replies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create replies"
  ON public.annotation_replies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
  ON public.annotation_replies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at trigger for annotations
CREATE OR REPLACE FUNCTION public.update_annotation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_annotation_updated_at
  BEFORE UPDATE ON public.attachment_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_annotation_updated_at();

-- Enable realtime for annotations
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachment_annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.annotation_replies;
