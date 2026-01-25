-- Drop the existing check constraint and add a new one that includes VCR
ALTER TABLE public.handover_certificate_templates 
DROP CONSTRAINT IF EXISTS handover_certificate_templates_certificate_type_check;

ALTER TABLE public.handover_certificate_templates 
ADD CONSTRAINT handover_certificate_templates_certificate_type_check 
CHECK (certificate_type IN ('PAC', 'FAC', 'VCR', 'SOF'));

-- Now insert the VCR template
INSERT INTO public.handover_certificate_templates (
  certificate_type,
  name,
  content,
  is_default,
  is_active,
  default_signatories
) VALUES (
  'VCR',
  'Default VCR Template',
  'VCR (Verification of Completion Readiness) certificate template for project handover verification points.',
  true,
  true,
  '[]'::jsonb
);