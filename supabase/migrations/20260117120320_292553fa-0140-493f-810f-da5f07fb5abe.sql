-- Add columns to pssrs table for persisting edit data
ALTER TABLE public.pssrs 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS pssr_lead_id UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS plant_id UUID,
ADD COLUMN IF NOT EXISTS field_id UUID,
ADD COLUMN IF NOT EXISTS station_id UUID;