
-- Add is_na flag to track items marked as Not Applicable per VCR
ALTER TABLE public.p2a_vcr_item_overrides 
ADD COLUMN is_na boolean NOT NULL DEFAULT false;

-- Add na_reason to optionally capture why the item is N/A
ALTER TABLE public.p2a_vcr_item_overrides 
ADD COLUMN na_reason text;
