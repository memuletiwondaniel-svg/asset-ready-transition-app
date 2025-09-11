-- Fix the RLS policies for user avatar uploads
-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create updated policies with correct path checking
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Also add admin access policy
CREATE POLICY "Admins can manage all avatars" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'user-avatars' 
  AND user_is_admin(auth.uid())
);