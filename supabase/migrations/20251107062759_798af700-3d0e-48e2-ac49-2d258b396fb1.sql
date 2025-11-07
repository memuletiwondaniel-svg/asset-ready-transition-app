-- Create storage bucket for AI query images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-query-images',
  'ai-query-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Policy: Users can upload their own AI query images
CREATE POLICY "Users can upload AI query images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ai-query-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own AI query images
CREATE POLICY "Users can view their own AI query images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ai-query-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own AI query images
CREATE POLICY "Users can delete their own AI query images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ai-query-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Public can view AI query images (for sharing)
CREATE POLICY "Public can view AI query images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ai-query-images');