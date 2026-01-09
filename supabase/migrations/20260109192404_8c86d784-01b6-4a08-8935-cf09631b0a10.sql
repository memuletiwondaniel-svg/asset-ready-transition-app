-- Create storage bucket for training evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-evidence', 'training-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for training evidence bucket
CREATE POLICY "Anyone can view training evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-evidence');

CREATE POLICY "Authenticated users can upload training evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'training-evidence' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their training evidence"
ON storage.objects FOR UPDATE
USING (bucket_id = 'training-evidence' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete training evidence"
ON storage.objects FOR DELETE
USING (bucket_id = 'training-evidence' AND auth.role() = 'authenticated');

-- Create table to track training evidence metadata
CREATE TABLE IF NOT EXISTS ora_training_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_item_id UUID NOT NULL REFERENCES ora_training_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  evidence_type TEXT NOT NULL DEFAULT 'other', -- 'attendance_sheet', 'photo', 'certificate', 'other'
  description TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE ora_training_evidence ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view training evidence records"
ON ora_training_evidence FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert training evidence"
ON ora_training_evidence FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete training evidence"
ON ora_training_evidence FOR DELETE USING (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX idx_training_evidence_item ON ora_training_evidence(training_item_id);