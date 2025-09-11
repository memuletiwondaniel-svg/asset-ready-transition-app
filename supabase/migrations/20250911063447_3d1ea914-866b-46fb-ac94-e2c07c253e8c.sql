-- Fix avatar upload policy for admin created users
-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Admins can manage all avatar files" ON storage.objects;

-- Create a comprehensive policy for avatar management
CREATE POLICY "Avatar upload policy"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'user-avatars' AND (
    -- Users can manage their own files  
    auth.uid()::text = split_part(name, '/', 1) OR
    -- Admins can manage all avatar files
    (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'::public.user_role
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'user-avatars' AND (
    -- Users can upload to their own folder
    auth.uid()::text = split_part(name, '/', 1) OR
    -- Admins can upload to any folder
    (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'::public.user_role
      )
    )
  )
);