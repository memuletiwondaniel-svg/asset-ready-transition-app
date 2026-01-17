
-- Migration: Clean up old-format roles in pssr_allowed_approver_roles

-- ================================================
-- STEP 1: Delete old format entries from pssr_allowed_approver_roles
-- These will be replaced with correct base roles
-- ================================================

-- Delete Engr. Manager (Asset) entry
DELETE FROM public.pssr_allowed_approver_roles 
WHERE role_id = '50f2c1d3-42f4-4848-9679-bb141fb785e7';

-- Delete Engr. Manager (P&E) entry
DELETE FROM public.pssr_allowed_approver_roles 
WHERE role_id = '54a1d463-f4d9-4a83-8e21-6155506e0d5f';

-- Delete Process TA2 (Asset) entry
DELETE FROM public.pssr_allowed_approver_roles 
WHERE role_id = 'b7c14fae-6856-4024-a0b1-c048b20e7d59';

-- Delete MTCE Manager entry (should be MTCE Lead)
DELETE FROM public.pssr_allowed_approver_roles 
WHERE role_id = '981e268b-470e-43ad-ab48-2d1d3eda5d30';

-- ================================================
-- STEP 2: Add correct base roles to pssr_allowed_approver_roles
-- ================================================

-- Add Engr. Manager (base role)
INSERT INTO public.pssr_allowed_approver_roles (role_id) 
VALUES ('40100852-e67a-4859-bc8a-e3e04e27a67d')
ON CONFLICT (role_id) DO NOTHING;

-- Add Process TA2 (base role)
INSERT INTO public.pssr_allowed_approver_roles (role_id) 
VALUES ('a71de5b4-8dc4-4ae5-8907-3ba35bd87342')
ON CONFLICT (role_id) DO NOTHING;

-- Add MTCE Lead (correct role)
INSERT INTO public.pssr_allowed_approver_roles (role_id) 
VALUES ('cd0c475f-b0e2-44dd-95f8-c3780faa1ecc')
ON CONFLICT (role_id) DO NOTHING;

-- ================================================
-- STEP 3: Soft-delete old format roles
-- ================================================
UPDATE public.roles 
SET is_active = false 
WHERE id IN (
    '50f2c1d3-42f4-4848-9679-bb141fb785e7',  -- Engr. Manager (Asset)
    '54a1d463-f4d9-4a83-8e21-6155506e0d5f',  -- Engr. Manager (P&E)
    '981e268b-470e-43ad-ab48-2d1d3eda5d30'   -- MTCE Manager
);

-- Note: Process TA2 (Asset) was already soft-deleted in previous migration
