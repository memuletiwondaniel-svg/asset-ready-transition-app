
-- ========== SCHEMA ==========
ALTER TABLE public.plant_role_holders
  ADD COLUMN IF NOT EXISTS field_id uuid REFERENCES public.field(id) ON DELETE SET NULL;

-- Resolver lookup index: same expression must be used in the pairing query
-- (see useB2BPartner). NULL field_id collapses to the zero-UUID sentinel so
-- two NULL-field rows share a bucket, but a NULL-field row never matches a
-- populated-field row.
CREATE INDEX IF NOT EXISTS plant_role_holders_pair_lookup
  ON public.plant_role_holders (
    role_id,
    plant_id,
    (COALESCE(field_id, '00000000-0000-0000-0000-000000000000'::uuid))
  );

-- ========== ROLE NAME RENAMES ==========
UPDATE public.roles SET name='Engr Manager – Asset',  updated_at=now() WHERE id='50f2c1d3-42f4-4848-9679-bb141fb785e7';
UPDATE public.roles SET name='Engr Manager – Project',updated_at=now() WHERE id='d29fd5db-18ee-4722-85f0-580834e6b75b';

-- TA2 active rows: hyphen → en-dash
UPDATE public.roles
   SET name = regexp_replace(name, ' - ', ' – '),
       updated_at = now()
 WHERE is_active = true
   AND name ~ ' TA2 - (Asset|Project)$';

-- Mtce Mgr: drop the dot
UPDATE public.roles
   SET name = regexp_replace(name, '^Mtce Mgr\.', 'Mtce Mgr'),
       updated_at = now()
 WHERE name LIKE 'Mtce Mgr.%';

-- Commissioning Engr: drop the dot
UPDATE public.roles
   SET name = regexp_replace(name, '^Commissioning Engr\.', 'Commissioning Engr'),
       updated_at = now()
 WHERE name LIKE 'Commissioning Engr.%';

-- ========== POSITION STRING MIRROR ==========
UPDATE public.profiles SET position='Engr Manager – Asset',  updated_at=now() WHERE position='Engr. Manager (Asset)';
UPDATE public.profiles SET position='Engr Manager – Project',updated_at=now() WHERE position='Engr. Manager (Project)';

UPDATE public.profiles
   SET position = regexp_replace(position, ' TA2 - (Asset|Project)$', ' TA2 – \1'),
       updated_at = now()
 WHERE position ~ ' TA2 - (Asset|Project)$';

-- Mtce Mgr positions: drop dot, normalize any " - " suffix separator to en-dash
UPDATE public.profiles
   SET position = regexp_replace(regexp_replace(position, '^Mtce Mgr\.', 'Mtce Mgr'), ' - ', ' – '),
       updated_at = now()
 WHERE position LIKE 'Mtce Mgr.%';

UPDATE public.profiles
   SET position = regexp_replace(position, '^Commissioning Engr\.', 'Commissioning Engr'),
       updated_at = now()
 WHERE position LIKE 'Commissioning Engr.%';

-- ========== OPS COACH: SCOPE + ROSTER + POSITION STRINGS ==========
UPDATE public.roles SET scope='plant', updated_at=now()
 WHERE id='8cb0dbf8-1ddd-475e-8205-45c115931b76';

-- Roster inserts (PK = (plant_id, role_id, user_id); upsert on conflict do nothing)
INSERT INTO public.plant_role_holders (plant_id, role_id, user_id, field_id, assigned_at)
VALUES
  -- Djurre Gans → KAZ, no field (latent pair)
  ('560481db-8fbb-4ce8-a2a7-665776cede16','8cb0dbf8-1ddd-475e-8205-45c115931b76','c9f44e36-eb5c-4463-965e-2b22a8f7e08b', NULL, now()),
  -- CS / South Rumaila — Sean Peppard + Dylan Smith
  ('bf55e720-c835-48db-beed-105ac945ac53','8cb0dbf8-1ddd-475e-8205-45c115931b76','47c1de68-2d42-4c64-ac30-17ff7c64c402','f5bb401b-f33e-4223-87ef-523b2859b9d4', now()),
  ('bf55e720-c835-48db-beed-105ac945ac53','8cb0dbf8-1ddd-475e-8205-45c115931b76','af4331fa-b7e4-4777-82f8-a4af4c160016','f5bb401b-f33e-4223-87ef-523b2859b9d4', now()),
  -- CS / West Qurna — Vinny Spice + Blake Alexander
  ('bf55e720-c835-48db-beed-105ac945ac53','8cb0dbf8-1ddd-475e-8205-45c115931b76','ab2fb57b-0c11-4f09-b7f7-b3dff1fc1e60','1ffac5ad-0504-46a3-80d8-7eef04d55452', now()),
  ('bf55e720-c835-48db-beed-105ac945ac53','8cb0dbf8-1ddd-475e-8205-45c115931b76','339e065f-2cc1-45b5-9647-83e376fc4e1f','1ffac5ad-0504-46a3-80d8-7eef04d55452', now()),
  -- CS / Zubair — Scott Miller + Craig Westwater
  ('bf55e720-c835-48db-beed-105ac945ac53','8cb0dbf8-1ddd-475e-8205-45c115931b76','14152fdd-31de-4d90-9a2a-f82944ae270e','e114552c-5f87-40b3-bffc-0fe7820a5ea8', now()),
  ('bf55e720-c835-48db-beed-105ac945ac53','8cb0dbf8-1ddd-475e-8205-45c115931b76','b54a60e7-e1a0-45be-9515-bcdff7284c7e','e114552c-5f87-40b3-bffc-0fe7820a5ea8', now())
ON CONFLICT (plant_id, role_id, user_id) DO UPDATE SET field_id = EXCLUDED.field_id;

-- Position strings normalized
UPDATE public.profiles SET position='Ops Coach – KAZ',           updated_at=now() WHERE user_id='c9f44e36-eb5c-4463-965e-2b22a8f7e08b';
UPDATE public.profiles SET position='Ops Coach – South Rumaila', updated_at=now() WHERE user_id IN ('47c1de68-2d42-4c64-ac30-17ff7c64c402','af4331fa-b7e4-4777-82f8-a4af4c160016');
UPDATE public.profiles SET position='Ops Coach – West Qurna',    updated_at=now() WHERE user_id IN ('ab2fb57b-0c11-4f09-b7f7-b3dff1fc1e60','339e065f-2cc1-45b5-9647-83e376fc4e1f');
UPDATE public.profiles SET position='Ops Coach – Zubair',        updated_at=now() WHERE user_id IN ('14152fdd-31de-4d90-9a2a-f82944ae270e','b54a60e7-e1a0-45be-9515-bcdff7284c7e');
