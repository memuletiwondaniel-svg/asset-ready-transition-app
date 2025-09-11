-- Fix admin policies for avatar uploads to satisfy INSERT WITH CHECK
DROP POLICY IF EXISTS "Admins can manage all avatars" ON storage.objects;

-- Create a single admin policy covering all commands with USING and WITH CHECK
CREATE POLICY "Admins can manage all avatars"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'user-avatars' AND user_is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'user-avatars' AND user_is_admin(auth.uid())
);