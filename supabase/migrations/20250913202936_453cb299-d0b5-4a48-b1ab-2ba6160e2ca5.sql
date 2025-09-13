-- Update the position column in profiles table to be text instead of uuid
-- This allows us to store human-readable position titles like "Engr. Manager – Asset"
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS position;

ALTER TABLE public.profiles 
ADD COLUMN position text;

-- Add a comment to clarify the purpose
COMMENT ON COLUMN public.profiles.position IS 'Human-readable position title generated from role and associated entities';