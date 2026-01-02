-- Rename columns in pssr_checklist_items table
ALTER TABLE public.pssr_checklist_items 
  RENAME COLUMN approving_authority TO approvers;

ALTER TABLE public.pssr_checklist_items 
  RENAME COLUMN category_id TO category;

ALTER TABLE public.pssr_checklist_items 
  RENAME COLUMN responsible_party TO responsible;

-- Drop the unique_id column since id is auto-generated
ALTER TABLE public.pssr_checklist_items 
  DROP COLUMN unique_id;