-- Add checklist_item_ids column to pssr_reason_configuration table
-- This will store the array of selected checklist item IDs for each PSSR reason
ALTER TABLE public.pssr_reason_configuration 
ADD COLUMN IF NOT EXISTS checklist_item_ids UUID[] DEFAULT '{}';