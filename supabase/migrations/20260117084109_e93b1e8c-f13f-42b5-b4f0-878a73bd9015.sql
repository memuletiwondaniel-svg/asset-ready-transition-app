
-- Migration: Clean up duplicate TA2 roles - consolidate to base format with commission

-- ================================================
-- STEP 1: Update PAC prerequisite DELIVERING parties
-- ================================================

-- TA2 Process - Asset → Process TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = 'a71de5b4-8dc4-4ae5-8907-3ba35bd87342'
WHERE role_id = 'fc3d099b-8ac5-4b8a-885b-437366801241';

-- TA2 Process - P&E → Process TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = 'a71de5b4-8dc4-4ae5-8907-3ba35bd87342'
WHERE role_id = '1ced17db-83bb-4dca-a52d-4cf80775336d';

-- TA2 Elect - Asset → Elect TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = '2827cd71-6ae8-4ece-821b-f4ce9ae6cebc'
WHERE role_id = '2ab553a8-953e-4d35-983e-73a1763337c0';

-- TA2 Elect - P&E → Elect TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = '2827cd71-6ae8-4ece-821b-f4ce9ae6cebc'
WHERE role_id = 'b11de257-f5e3-4411-993f-82f562764e67';

-- TA2 Rotating - Asset → Rotating TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = '414a5aa3-b962-4884-a7db-c8e12326514a'
WHERE role_id = '4b2c2936-35ab-40a4-97bc-3ccb0ec5e11e';

-- TA2 Rotating - P&E → Rotating TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = '414a5aa3-b962-4884-a7db-c8e12326514a'
WHERE role_id = '73ccc6bd-243c-4c3a-b331-0bd0343d4bc3';

-- TA2 Static - Asset → Static TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = 'c0ca8a85-a102-4248-b3bd-0d57e67ec844'
WHERE role_id = '5559dc07-2bc3-4238-80d0-ba966610c92c';

-- TA2 Static - P&E → Static TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = 'c0ca8a85-a102-4248-b3bd-0d57e67ec844'
WHERE role_id = 'd4eaf9c0-ed48-4632-a5b4-861219fee2dd';

-- TA2 Civil - Asset → Civil TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = '6bbd12f4-cad2-4ccb-8e73-8710cdca2216'
WHERE role_id = '41cb8b07-4860-4528-ba85-6952e1e29b67';

-- TA2 Civil - P&E → Civil TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = '6bbd12f4-cad2-4ccb-8e73-8710cdca2216'
WHERE role_id = 'd80d8585-b843-4ed1-83fa-72ca1097bef8';

-- TA2 PACO - Asset → PACO TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = '23d61604-150c-4edd-8338-30a1da3ab6fb'
WHERE role_id = 'ca604123-686a-4599-aafb-d92675475845';

-- TA2 PACO - P&E → PACO TA2
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = '23d61604-150c-4edd-8338-30a1da3ab6fb'
WHERE role_id = 'dca11c8f-76ea-4b2a-a440-dcc610bcf8cf';

-- TA2 MCI - Asset → (no direct equivalent, use Process TA2 as closest match)
UPDATE public.pac_prerequisite_delivering_parties 
SET role_id = 'a71de5b4-8dc4-4ae5-8907-3ba35bd87342'
WHERE role_id = '3b16e158-b055-4733-8390-30584bc22927';

-- ================================================
-- STEP 2: Update PAC prerequisite RECEIVING parties
-- ================================================

-- TA2 Process - Asset → Process TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = 'a71de5b4-8dc4-4ae5-8907-3ba35bd87342'
WHERE role_id = 'fc3d099b-8ac5-4b8a-885b-437366801241';

-- TA2 Process - P&E → Process TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = 'a71de5b4-8dc4-4ae5-8907-3ba35bd87342'
WHERE role_id = '1ced17db-83bb-4dca-a52d-4cf80775336d';

-- TA2 Elect - Asset → Elect TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = '2827cd71-6ae8-4ece-821b-f4ce9ae6cebc'
WHERE role_id = '2ab553a8-953e-4d35-983e-73a1763337c0';

-- TA2 Elect - P&E → Elect TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = '2827cd71-6ae8-4ece-821b-f4ce9ae6cebc'
WHERE role_id = 'b11de257-f5e3-4411-993f-82f562764e67';

-- TA2 Rotating - Asset → Rotating TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = '414a5aa3-b962-4884-a7db-c8e12326514a'
WHERE role_id = '4b2c2936-35ab-40a4-97bc-3ccb0ec5e11e';

-- TA2 Rotating - P&E → Rotating TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = '414a5aa3-b962-4884-a7db-c8e12326514a'
WHERE role_id = '73ccc6bd-243c-4c3a-b331-0bd0343d4bc3';

-- TA2 Static - Asset → Static TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = 'c0ca8a85-a102-4248-b3bd-0d57e67ec844'
WHERE role_id = '5559dc07-2bc3-4238-80d0-ba966610c92c';

-- TA2 Static - P&E → Static TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = 'c0ca8a85-a102-4248-b3bd-0d57e67ec844'
WHERE role_id = 'd4eaf9c0-ed48-4632-a5b4-861219fee2dd';

-- TA2 Civil - Asset → Civil TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = '6bbd12f4-cad2-4ccb-8e73-8710cdca2216'
WHERE role_id = '41cb8b07-4860-4528-ba85-6952e1e29b67';

-- TA2 Civil - P&E → Civil TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = '6bbd12f4-cad2-4ccb-8e73-8710cdca2216'
WHERE role_id = 'd80d8585-b843-4ed1-83fa-72ca1097bef8';

-- TA2 PACO - Asset → PACO TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = '23d61604-150c-4edd-8338-30a1da3ab6fb'
WHERE role_id = 'ca604123-686a-4599-aafb-d92675475845';

-- TA2 PACO - P&E → PACO TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = '23d61604-150c-4edd-8338-30a1da3ab6fb'
WHERE role_id = 'dca11c8f-76ea-4b2a-a440-dcc610bcf8cf';

-- TA2 MCI - Asset → Process TA2
UPDATE public.pac_prerequisite_receiving_parties 
SET role_id = 'a71de5b4-8dc4-4ae5-8907-3ba35bd87342'
WHERE role_id = '3b16e158-b055-4733-8390-30584bc22927';

-- ================================================
-- STEP 3: Update user with old format role (Christian Johnsen)
-- Change from TA2 Process - P&E to Process TA2
-- ================================================
UPDATE public.profiles 
SET role = 'a71de5b4-8dc4-4ae5-8907-3ba35bd87342'
WHERE role = '1ced17db-83bb-4dca-a52d-4cf80775336d';

-- ================================================
-- STEP 4: Soft-delete all old format TA2 roles
-- ================================================
UPDATE public.roles 
SET is_active = false 
WHERE id IN (
    '41cb8b07-4860-4528-ba85-6952e1e29b67',  -- TA2 Civil - Asset
    'd80d8585-b843-4ed1-83fa-72ca1097bef8',  -- TA2 Civil - P&E
    '2ab553a8-953e-4d35-983e-73a1763337c0',  -- TA2 Elect - Asset
    'b11de257-f5e3-4411-993f-82f562764e67',  -- TA2 Elect - P&E
    '3b16e158-b055-4733-8390-30584bc22927',  -- TA2 MCI - Asset
    'ca604123-686a-4599-aafb-d92675475845',  -- TA2 PACO - Asset
    'dca11c8f-76ea-4b2a-a440-dcc610bcf8cf',  -- TA2 PACO - P&E
    'fc3d099b-8ac5-4b8a-885b-437366801241',  -- TA2 Process - Asset
    '1ced17db-83bb-4dca-a52d-4cf80775336d',  -- TA2 Process - P&E
    '4b2c2936-35ab-40a4-97bc-3ccb0ec5e11e',  -- TA2 Rotating - Asset
    '73ccc6bd-243c-4c3a-b331-0bd0343d4bc3',  -- TA2 Rotating - P&E
    '5559dc07-2bc3-4238-80d0-ba966610c92c',  -- TA2 Static - Asset
    'd4eaf9c0-ed48-4632-a5b4-861219fee2dd',  -- TA2 Static - P&E
    'b7c14fae-6856-4024-a0b1-c048b20e7d59'   -- Process TA2 (Asset)
);
