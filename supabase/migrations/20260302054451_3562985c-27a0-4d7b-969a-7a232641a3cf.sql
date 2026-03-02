-- Create a backup/archive storage bucket for critical file backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('file-backups', 'file-backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only admins can access backup bucket
CREATE POLICY "Admins can manage file backups"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'file-backups' 
  AND public.user_is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'file-backups' 
  AND public.user_is_admin(auth.uid())
);