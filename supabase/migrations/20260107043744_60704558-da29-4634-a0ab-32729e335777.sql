-- Update "Equipment Compliance" reason to "Technical Integrity" with new description
UPDATE public.pssr_reasons
SET 
  name = 'Technical Integrity',
  description = 'Equipment is designed, installed and commissioned in accordance with approved design and engineering standards',
  updated_at = now()
WHERE name = 'Equipment Compliance';