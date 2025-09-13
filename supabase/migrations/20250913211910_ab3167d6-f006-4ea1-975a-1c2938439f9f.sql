-- Update Firas Mousa's status to active
UPDATE public.profiles 
SET status = 'active', 
    account_status = 'active',
    updated_at = now()
WHERE email = 'firas.mousa@basrahgas.iq';

-- Create a function to approve/activate users
CREATE OR REPLACE FUNCTION public.approve_user_account(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update user status to active
  UPDATE public.profiles 
  SET 
    status = 'active',
    account_status = 'active',
    updated_at = now()
  WHERE user_id = target_user_id;
  
  -- Log the approval action
  INSERT INTO public.user_activity_logs (user_id, activity_type, description)
  VALUES (target_user_id, 'account_approved', 'User account was approved and activated');
  
  RETURN true;
END;
$$;

-- Create a function to reject user accounts
CREATE OR REPLACE FUNCTION public.reject_user_account(target_user_id uuid, rejection_reason_text text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update user status to rejected
  UPDATE public.profiles 
  SET 
    status = 'rejected',
    account_status = 'suspended',
    rejection_reason = rejection_reason_text,
    updated_at = now()
  WHERE user_id = target_user_id;
  
  -- Log the rejection action
  INSERT INTO public.user_activity_logs (user_id, activity_type, description, metadata)
  VALUES (
    target_user_id, 
    'account_rejected', 
    'User account was rejected',
    jsonb_build_object('rejection_reason', rejection_reason_text)
  );
  
  RETURN true;
END;
$$;