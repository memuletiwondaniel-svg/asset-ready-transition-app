-- Policies for chat_attachments uploads
CREATE POLICY "Authenticated users can upload to chat_attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat_attachments');

-- Public read access for chat_attachments (so preview links work without auth)
CREATE POLICY "Public read access on chat_attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat_attachments');

-- Allow users to delete their own files in chat_attachments
CREATE POLICY "Users can delete own chat_attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat_attachments' AND owner = auth.uid());