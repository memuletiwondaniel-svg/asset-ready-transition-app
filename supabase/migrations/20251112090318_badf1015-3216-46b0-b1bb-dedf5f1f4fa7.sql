-- Create storage bucket for ORP attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('orp-attachments', 'orp-attachments', false);

-- Create RLS policies for ORP attachments
CREATE POLICY "Users can view ORP attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'orp-attachments' AND
  (EXISTS (
    SELECT 1 FROM orp_plan_deliverables pd
    JOIN orp_plans p ON p.id = pd.orp_plan_id
    WHERE (storage.foldername(name))[1] = pd.id::text
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid() OR user_is_admin(auth.uid()))
  ))
);

CREATE POLICY "Users can upload ORP attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'orp-attachments' AND
  (EXISTS (
    SELECT 1 FROM orp_plan_deliverables pd
    JOIN orp_plans p ON p.id = pd.orp_plan_id
    WHERE (storage.foldername(name))[1] = pd.id::text
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
  ))
);

CREATE POLICY "Users can delete ORP attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'orp-attachments' AND
  (EXISTS (
    SELECT 1 FROM orp_plan_deliverables pd
    JOIN orp_plans p ON p.id = pd.orp_plan_id
    WHERE (storage.foldername(name))[1] = pd.id::text
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
  ))
);

-- Create table for tracking ORP attachments metadata
CREATE TABLE public.orp_deliverable_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_deliverable_id UUID NOT NULL REFERENCES orp_plan_deliverables(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orp_deliverable_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deliverable attachments"
ON public.orp_deliverable_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orp_plan_deliverables pd
    JOIN orp_plans p ON p.id = pd.orp_plan_id
    WHERE pd.id = plan_deliverable_id
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid() OR user_is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can upload deliverable attachments"
ON public.orp_deliverable_attachments FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM orp_plan_deliverables pd
    JOIN orp_plans p ON p.id = pd.orp_plan_id
    WHERE pd.id = plan_deliverable_id
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
  )
);

CREATE POLICY "Users can delete deliverable attachments"
ON public.orp_deliverable_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM orp_plan_deliverables pd
    JOIN orp_plans p ON p.id = pd.orp_plan_id
    WHERE pd.id = plan_deliverable_id
    AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
  )
);

-- Enable realtime for ORP tables
ALTER PUBLICATION supabase_realtime ADD TABLE orp_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE orp_plan_deliverables;
ALTER PUBLICATION supabase_realtime ADD TABLE orp_approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE orp_resources;

-- Set replica identity for realtime
ALTER TABLE orp_plans REPLICA IDENTITY FULL;
ALTER TABLE orp_plan_deliverables REPLICA IDENTITY FULL;
ALTER TABLE orp_approvals REPLICA IDENTITY FULL;
ALTER TABLE orp_resources REPLICA IDENTITY FULL;