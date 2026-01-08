-- Create storage bucket for PSSR attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('pssr-attachments', 'pssr-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view files in this bucket
CREATE POLICY "Public Access for PSSR Attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'pssr-attachments');

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload PSSR attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pssr-attachments');

-- Policy: Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update PSSR attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pssr-attachments');

-- Policy: Authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete PSSR attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pssr-attachments');