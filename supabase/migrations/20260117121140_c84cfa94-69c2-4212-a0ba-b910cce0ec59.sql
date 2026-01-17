-- Add scope_image_url column to pssrs table
ALTER TABLE public.pssrs 
ADD COLUMN IF NOT EXISTS scope_image_url TEXT;