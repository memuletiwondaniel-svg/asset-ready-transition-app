-- Add position column to profiles table to store generated position titles
ALTER TABLE public.profiles ADD COLUMN position TEXT;