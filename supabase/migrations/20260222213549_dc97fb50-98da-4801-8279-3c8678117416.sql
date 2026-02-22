-- Add JSONB column to store checklist item overrides in draft PSSRs
ALTER TABLE public.pssrs 
ADD COLUMN IF NOT EXISTS draft_item_overrides jsonb DEFAULT NULL;