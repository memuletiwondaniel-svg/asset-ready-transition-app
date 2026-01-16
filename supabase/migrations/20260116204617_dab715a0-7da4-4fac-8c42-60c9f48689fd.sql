-- Add default_signatories column to handover_certificate_templates
ALTER TABLE public.handover_certificate_templates 
ADD COLUMN IF NOT EXISTS default_signatories JSONB DEFAULT '[]';

-- Seed default approvers for PAC templates
UPDATE public.handover_certificate_templates 
SET default_signatories = '[
  {"role_name": "Project Team Lead", "display_order": 1},
  {"role_name": "Asset Team Lead", "display_order": 2},
  {"role_name": "Operations Manager", "display_order": 3},
  {"role_name": "Plant Director", "display_order": 4}
]'::jsonb
WHERE certificate_type = 'PAC' AND is_default = true;

-- Seed default approvers for FAC templates
UPDATE public.handover_certificate_templates 
SET default_signatories = '[
  {"role_name": "Plant Director", "display_order": 1},
  {"role_name": "Project Manager", "display_order": 2}
]'::jsonb
WHERE certificate_type = 'FAC' AND is_default = true;