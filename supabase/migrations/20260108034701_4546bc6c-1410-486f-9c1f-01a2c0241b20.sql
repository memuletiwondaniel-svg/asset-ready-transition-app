-- Create storage bucket for project attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-attachments', 'project-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for project attachments
CREATE POLICY "Allow authenticated users to upload project attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-attachments');

CREATE POLICY "Allow public read access to project attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'project-attachments');

CREATE POLICY "Allow users to update their own project attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'project-attachments' AND auth.uid()::text = owner_id::text);

CREATE POLICY "Allow users to delete their own project attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'project-attachments' AND auth.uid()::text = owner_id::text);