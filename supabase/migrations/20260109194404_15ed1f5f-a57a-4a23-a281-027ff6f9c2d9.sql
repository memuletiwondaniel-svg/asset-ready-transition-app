-- Create training-materials storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-materials', 'training-materials', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for training-materials bucket
CREATE POLICY "Authenticated users can upload training materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'training-materials');

CREATE POLICY "Authenticated users can view training materials"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'training-materials');

CREATE POLICY "Authenticated users can update their training materials"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'training-materials');

CREATE POLICY "Authenticated users can delete training materials"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'training-materials');