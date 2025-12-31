-- Add category and sub_category columns to pssr_reasons
ALTER TABLE public.pssr_reasons 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Add check constraints
ALTER TABLE public.pssr_reasons 
DROP CONSTRAINT IF EXISTS pssr_reasons_category_check,
ADD CONSTRAINT pssr_reasons_category_check 
  CHECK (category IS NULL OR category IN ('Project', 'Safety Incidence', 'Ops & Mtce'));

ALTER TABLE public.pssr_reasons 
DROP CONSTRAINT IF EXISTS pssr_reasons_sub_category_check,
ADD CONSTRAINT pssr_reasons_sub_category_check 
  CHECK (sub_category IS NULL OR sub_category IN ('P&E', 'BFM'));

-- Add comments for documentation
COMMENT ON COLUMN public.pssr_reasons.category IS 'Main category: Project, Safety Incidence, or Ops & Mtce';
COMMENT ON COLUMN public.pssr_reasons.sub_category IS 'Sub-category for Project: P&E or BFM';