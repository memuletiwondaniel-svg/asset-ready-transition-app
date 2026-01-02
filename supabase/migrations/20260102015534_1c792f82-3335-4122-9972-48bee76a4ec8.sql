-- Add topic column to pssr_checklist_items table
ALTER TABLE public.pssr_checklist_items
ADD COLUMN topic text;