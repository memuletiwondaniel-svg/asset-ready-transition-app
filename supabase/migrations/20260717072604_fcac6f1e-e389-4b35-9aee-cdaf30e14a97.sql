
-- RLS on storage.objects is already enabled globally by Supabase.
-- These policies are scoped to bucket_id = 'procedure-attachments'.

CREATE POLICY "procedure-attachments read (authenticated)"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'procedure-attachments');

CREATE POLICY "procedure-attachments insert (authenticated)"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'procedure-attachments' AND auth.uid() = owner);

CREATE POLICY "procedure-attachments update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'procedure-attachments' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'procedure-attachments' AND auth.uid() = owner);

CREATE POLICY "procedure-attachments delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'procedure-attachments' AND auth.uid() = owner);
