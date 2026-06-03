-- 1. Catalog: reactivate + create
UPDATE public.roles SET is_active = true, updated_at = now()
 WHERE name IN ('Process TA2 - Asset', 'Engr. Manager (Asset)');

INSERT INTO public.roles (name, code, is_active, is_retired)
VALUES ('Engr. Manager (Project)', 'ENGR_MANAGER_PROJECT', true, false)
ON CONFLICT (name) DO UPDATE SET is_active = true, is_retired = false, updated_at = now();

-- 2. Fix Geert's position so existing useB2BPartner detects the MCI-Asset pair
UPDATE public.profiles
   SET position = 'MCI TA2 - Asset', updated_at = now()
 WHERE user_id = 'c22b9de5-97e4-40f2-ba49-5677b06bedd4'
   AND position = 'MCI TA2';

-- 3. Mark global roles
UPDATE public.roles SET is_global = true, updated_at = now()
 WHERE name IN (
   'ORA Lead','P&M Director','P&E Director','HSE Director',
   'Civil TA2',
   'Elect TA2 - Project','MCI TA2 - Project','PACO TA2 - Project',
   'Process TA2 - Project','Rotating TA2 - Project','Static TA2 - Project',
   'Elect TA2 - Asset','MCI TA2 - Asset','PACO TA2 - Asset',
   'Process TA2 - Asset','Rotating TA2 - Asset','Static TA2 - Asset',
   'Engr. Manager (Asset)','Engr. Manager (Project)',
   'TSE Manager','ER Adviser'
 );

-- 4. Seed holders (already-seeded singles ORA/P&M/P&E/HSE Director skipped via ON CONFLICT)
WITH holders(role_name, user_id) AS (
  VALUES
    -- TIER A singles
    ('Civil TA2',               '9db7a3a8-f3aa-4618-80e5-e18dfeb5d808'::uuid), -- Satya Borra
    ('Elect TA2 - Asset',       '67835b48-7e50-4f5c-bc20-92f460729bd4'::uuid), -- Woon Haur Lee
    ('Engr. Manager (Project)', '0942bfe3-17b5-41a7-920e-c0802b9764b2'::uuid), -- Martyn Turner
    ('TSE Manager',             '3f170955-1b41-4280-8152-d49951315a48'::uuid), -- Graham Robert
    ('TSE Manager',             'ff43d21f-67c9-4233-b4e3-f8f6e93c1e81'::uuid), -- Lee Gascoigne (B2B)
    ('ER Adviser',              '1965a5db-a26b-4cad-a2db-d83582f72c99'::uuid), -- Troy Stawart
    -- TA2 Project B2B
    ('Elect TA2 - Project',     '49dc0c20-4689-41f6-9984-a2f6e280e946'::uuid), -- Chan Chew Ping
    ('Elect TA2 - Project',     'a08c4d0d-334c-421c-b217-51f3459d89ad'::uuid), -- Yasser Mohamed
    ('PACO TA2 - Project',      '4773dc8f-6f91-48e2-8bd2-54d9cce8e74c'::uuid), -- David Brown
    ('PACO TA2 - Project',      'ad02e2e2-59c8-446e-a3a4-6a667e27e0aa'::uuid), -- Kersha Andrews
    ('Process TA2 - Project',   'b502edf2-984a-44f4-855c-ede788fa0d5e'::uuid), -- Ghassan Majdalani
    ('Process TA2 - Project',   'd9f75bc9-aa32-4822-b1e5-5f6bd6049efd'::uuid), -- Christian Johnsen
    ('Rotating TA2 - Project',  'bb516b6f-5bab-40d2-838c-3a0d406368c0'::uuid), -- Nathan Roberts
    ('Rotating TA2 - Project',  '259d9f22-4e2a-4fcc-92f6-771747a387d5'::uuid), -- Tim Brown
    ('Static TA2 - Project',    '9cf35b97-22b8-49c6-9fc0-7151fe2a0713'::uuid), -- Prakash Prinston
    ('Static TA2 - Project',    '9e6ddd6d-4afd-4af7-ad55-62f17c8d2e53'::uuid), -- Stuart Lugo
    -- TA2 Asset B2B
    ('MCI TA2 - Asset',         '2b895421-7c10-483b-980b-284debec1df2'::uuid), -- David Ireland
    ('MCI TA2 - Asset',         'c22b9de5-97e4-40f2-ba49-5677b06bedd4'::uuid), -- Geert Uildriks (retagged)
    ('PACO TA2 - Asset',        'e2ff0461-4743-4367-a516-848ed108a840'::uuid), -- Bart Den Hond
    ('PACO TA2 - Asset',        'f32bc5e8-bf17-45c4-bd3a-bcfe32fcaf2c'::uuid), -- Scott MacLean
    ('Process TA2 - Asset',     'e2146fc7-5d51-4e46-af7c-062addb2c40b'::uuid), -- Arvind Gupta
    ('Process TA2 - Asset',     'f24408e0-4d30-49db-82b9-7fae440946b6'::uuid), -- Hugo Satink
    ('Rotating TA2 - Asset',    '706c8a81-4340-4316-8123-8c180bebc3b6'::uuid), -- Hamad El Naggar
    ('Rotating TA2 - Asset',    'bfb38ac2-a280-4b1c-8f11-f75c58ebbff0'::uuid), -- Lip Tong
    ('Static TA2 - Asset',      '22ecf287-1a24-406d-906f-eca42cdcc27a'::uuid), -- Clive Reay
    ('Static TA2 - Asset',      '87a805bc-edac-43b9-93c7-c0fb8e23e7d1'::uuid), -- Rajesh Bholasing
    -- Engr Manager Asset B2B
    ('Engr. Manager (Asset)',   'd67fa587-17d3-48ba-931c-2521824ea408'::uuid), -- Harald Traa
    ('Engr. Manager (Asset)',   'b028fda3-fe3f-482c-b14d-e0d31c7ebeb9'::uuid)  -- Mohamed Ehab
)
INSERT INTO public.org_role_holders (role_id, user_id)
SELECT r.id, h.user_id
  FROM holders h
  JOIN public.roles r ON r.name = h.role_name
 ON CONFLICT (role_id, user_id) DO NOTHING;