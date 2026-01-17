-- Add hub column to profiles table for storing hub assignment
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hub uuid REFERENCES public.hubs(id);

-- Create index for faster hub lookups
CREATE INDEX IF NOT EXISTS idx_profiles_hub ON public.profiles(hub);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.hub IS 'Reference to the hub this user is assigned to';