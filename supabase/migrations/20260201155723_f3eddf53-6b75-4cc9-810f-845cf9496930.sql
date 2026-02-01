-- Update PSSR with project name
UPDATE public.pssrs 
SET project_name = 'DP300 Dolphin Platform Upgrade',
    asset = 'Dolphin Platform'
WHERE id = '07d1679b-e53e-4b5b-a6df-3a100d30aa6b';

-- Create SoF certificate for DP300 PSSR with DRAFT status
INSERT INTO public.sof_certificates (
  id,
  pssr_id,
  certificate_number,
  project_name,
  plant_name,
  facility_name,
  pssr_reason,
  certificate_text,
  status
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '07d1679b-e53e-4b5b-a6df-3a100d30aa6b',
  'SOF-DP300-001',
  'DP300 Dolphin Platform Upgrade',
  'Dolphin',
  'Platform Alpha',
  'Start-up after major upgrade',
  'This Statement of Fitness certifies that all pre-startup safety review requirements have been satisfactorily completed for the DP300 Dolphin Platform Upgrade project.',
  'DRAFT'
) ON CONFLICT (id) DO NOTHING;

-- Add SoF approvers for the three directors
-- Marije Hoedemaker (P&E Director)
INSERT INTO public.sof_approvers (
  id,
  sof_certificate_id,
  pssr_id,
  user_id,
  approver_name,
  approver_role,
  approver_level,
  status
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '07d1679b-e53e-4b5b-a6df-3a100d30aa6b',
  'bd8dd7af-6bd4-4ca5-99ca-20bd53e38b4e',
  'Marije Hoedemaker',
  'P&E Director',
  1,
  'PENDING'
) ON CONFLICT (id) DO NOTHING;

-- Paul Van Den Hemel (P&M Director)
INSERT INTO public.sof_approvers (
  id,
  sof_certificate_id,
  pssr_id,
  user_id,
  approver_name,
  approver_role,
  approver_level,
  status
) VALUES (
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '07d1679b-e53e-4b5b-a6df-3a100d30aa6b',
  '0dae95bb-6cdb-491d-ac4c-4c0cd7b2e8b2',
  'Paul Van Den Hemel',
  'P&M Director',
  2,
  'PENDING'
) ON CONFLICT (id) DO NOTHING;

-- Ali Danbous (HSE Director)
INSERT INTO public.sof_approvers (
  id,
  sof_certificate_id,
  pssr_id,
  user_id,
  approver_name,
  approver_role,
  approver_level,
  status
) VALUES (
  'd4e5f6a7-b8c9-0123-defa-456789012345',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '07d1679b-e53e-4b5b-a6df-3a100d30aa6b',
  '52d07b04-bd60-4980-9f78-f2353b1bcbf9',
  'Ali Danbous',
  'HSE Director',
  3,
  'PENDING'
) ON CONFLICT (id) DO NOTHING;