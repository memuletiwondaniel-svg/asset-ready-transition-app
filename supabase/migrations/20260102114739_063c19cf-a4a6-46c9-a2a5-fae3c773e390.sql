-- Remove discipline column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS discipline;