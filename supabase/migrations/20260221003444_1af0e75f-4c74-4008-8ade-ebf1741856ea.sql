
-- Add columns to persist wizard checklist state on drafts
ALTER TABLE public.pssrs 
  ADD COLUMN IF NOT EXISTS draft_checklist_item_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS draft_na_item_ids TEXT[] DEFAULT '{}';
