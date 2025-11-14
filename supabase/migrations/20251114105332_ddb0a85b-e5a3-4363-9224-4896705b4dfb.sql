
-- Add DELETE policy for profiles table
-- Only admins should be able to delete user profiles
CREATE POLICY "Admins can delete any profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (user_is_admin(auth.uid()));

-- Create a secure function to delete users (handles both auth.users and profiles)
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_deleted_email text;
  v_deleted_name text;
BEGIN
  -- Check if the caller is an admin
  SELECT user_is_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can delete users'
    );
  END IF;

  -- Prevent self-deletion
  IF auth.uid() = target_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete your own account'
    );
  END IF;

  -- Get user info before deletion (for logging)
  SELECT email, full_name 
  INTO v_deleted_email, v_deleted_name
  FROM public.profiles
  WHERE user_id = target_user_id;

  IF v_deleted_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Delete from auth.users (this will cascade to profiles due to foreign key)
  DELETE FROM auth.users WHERE id = target_user_id;

  -- Return success with deleted user info
  RETURN jsonb_build_object(
    'success', true,
    'deleted_user', jsonb_build_object(
      'user_id', target_user_id,
      'email', v_deleted_email,
      'full_name', v_deleted_name
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (function checks admin internally)
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.delete_user_account IS 'Securely deletes a user account. Only admins can use this. Prevents self-deletion.';
