-- Migration: Remove TA2 TSE - Asset and TA2 TSE - P&E roles

-- Update PAC prerequisite delivering parties to use Tech Safety TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = 'f0284734-bc04-45c7-aeed-9d55e232b450'
WHERE role_id IN ('00b666c3-b900-41b0-8a92-a2b37f6e479e', 'a03b8e9e-9d6c-434e-b0b6-e80ed3c8f155');

-- Update PAC prerequisite receiving parties to use Tech Safety TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = 'f0284734-bc04-45c7-aeed-9d55e232b450'
WHERE role_id IN ('00b666c3-b900-41b0-8a92-a2b37f6e479e', 'a03b8e9e-9d6c-434e-b0b6-e80ed3c8f155');

-- Soft delete the incorrect roles
UPDATE public.roles 
SET is_active = false 
WHERE id IN ('00b666c3-b900-41b0-8a92-a2b37f6e479e', 'a03b8e9e-9d6c-434e-b0b6-e80ed3c8f155');