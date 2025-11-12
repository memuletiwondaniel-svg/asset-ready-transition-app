-- Create storage bucket for P2A attachments (already exists: p2a-attachments)
-- Just ensure RLS policies are set

-- Create P2A deliverable attachments table
CREATE TABLE public.p2a_deliverable_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID NOT NULL REFERENCES public.p2a_handover_deliverables(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2a_deliverable_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attachments
CREATE POLICY "Users can view deliverable attachments"
ON public.p2a_deliverable_attachments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.p2a_handover_deliverables d
  JOIN public.p2a_handovers h ON d.handover_id = h.id
  WHERE d.id = p2a_deliverable_attachments.deliverable_id AND h.is_active = true
));

CREATE POLICY "Users can upload deliverable attachments"
ON public.p2a_deliverable_attachments FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own attachments"
ON public.p2a_deliverable_attachments FOR DELETE
USING (auth.uid() = uploaded_by OR user_is_admin(auth.uid()));

-- Storage policies for p2a-attachments bucket
-- Allow authenticated users to upload files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'p2a-attachments',
  'p2a-attachments',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload P2A attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'p2a-attachments');

CREATE POLICY "Users can view P2A attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'p2a-attachments');

CREATE POLICY "Users can delete their own P2A attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'p2a-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add realtime presence tracking table
CREATE TABLE public.p2a_user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  handover_id UUID NOT NULL REFERENCES public.p2a_handovers(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES public.p2a_handover_deliverables(id) ON DELETE CASCADE,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_editing BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, handover_id, deliverable_id)
);

-- Enable RLS
ALTER TABLE public.p2a_user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view presence"
ON public.p2a_user_presence FOR SELECT
USING (true);

CREATE POLICY "Users can update their own presence"
ON public.p2a_user_presence FOR ALL
USING (auth.uid() = user_id);