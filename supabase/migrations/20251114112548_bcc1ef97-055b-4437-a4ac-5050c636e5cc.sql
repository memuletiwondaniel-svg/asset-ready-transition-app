-- Fix user_audit_logs foreign key to allow cascade deletion
-- Drop the existing foreign key constraint
ALTER TABLE public.user_audit_logs
DROP CONSTRAINT IF EXISTS user_audit_logs_user_id_fkey;

-- Recreate the foreign key with CASCADE on delete
-- This allows audit logs to be automatically deleted when a user is deleted
ALTER TABLE public.user_audit_logs
ADD CONSTRAINT user_audit_logs_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Add a comment explaining the cascade behavior
COMMENT ON CONSTRAINT user_audit_logs_user_id_fkey ON public.user_audit_logs 
IS 'Foreign key to profiles with CASCADE delete - audit logs are removed when user is deleted';