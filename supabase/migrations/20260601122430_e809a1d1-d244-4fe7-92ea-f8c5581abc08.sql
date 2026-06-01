
-- ============================================================
-- Migration 5b (v2) — roles.code + TA2 merge + current_user_has_role_code helper
-- v2 fix: roles.name has a UNIQUE constraint (roles_name_key), so the winner
--         rename must happen AFTER the loser row is deleted. Re-ordered A.1↔A.4.
-- ============================================================

BEGIN;

-- ---------- A) TA2 duplicate-role merge ---------------------
-- Winner: b7c14fae-6856-4024-a0b1-c048b20e7d59   (currently 'Process TA2 (Asset)')
-- Loser:  ac14d17b-659c-4fe8-bf31-07314c15e052   (currently 'Process TA2 - Asset')
-- Per Sr Dev: surviving label = 'Process TA2 - Asset' (matches the 2 existing
-- profiles.position rows so no live mutation of profile labels is needed).

-- A.0 Pre-check: refuse to proceed if downstream surfaces grew references we missed
DO $$
DECLARE
  ref_count int;
BEGIN
  SELECT count(*) INTO ref_count FROM public.profiles
    WHERE role::text = 'ac14d17b-659c-4fe8-bf31-07314c15e052';
  IF ref_count <> 2 THEN
    RAISE EXCEPTION 'Mig 5b abort: profiles.role refs to loser TA2 = %, expected 2 (re-scan before merging)', ref_count;
  END IF;
END$$;

-- A.1 Repoint the 2 profiles to the winner UUID
UPDATE public.profiles
   SET role = 'b7c14fae-6856-4024-a0b1-c048b20e7d59'
 WHERE role::text = 'ac14d17b-659c-4fe8-bf31-07314c15e052';

-- A.2 Verify zero references remain to the loser before delete
DO $$
DECLARE
  remaining int;
BEGIN
  SELECT count(*) INTO remaining FROM public.profiles
    WHERE role::text = 'ac14d17b-659c-4fe8-bf31-07314c15e052';
  IF remaining <> 0 THEN
    RAISE EXCEPTION 'Mig 5b abort: % profiles still reference loser TA2 id after repoint', remaining;
  END IF;
END$$;

-- A.3 Delete the loser (frees the 'Process TA2 - Asset' name for the winner)
DELETE FROM public.roles
 WHERE id = 'ac14d17b-659c-4fe8-bf31-07314c15e052';

-- A.4 Rename winner to the canonical surviving label (name UNIQUE now satisfied)
UPDATE public.roles
   SET name = 'Process TA2 - Asset'
 WHERE id = 'b7c14fae-6856-4024-a0b1-c048b20e7d59'
   AND name = 'Process TA2 (Asset)';

-- ---------- B) roles.code column + slug back-fill -----------

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS code text;

-- Slug rule: uppercase, alnum-only, runs of non-alnum collapse to single _, trimmed.
-- Applied uniformly so back-fill is reproducible.
UPDATE public.roles
   SET code = upper(
        regexp_replace(
          regexp_replace(coalesce(name,''), '[^A-Za-z0-9]+', '_', 'g'),
          '^_+|_+$', '', 'g'
        )
      )
 WHERE code IS NULL;

-- Pin canonical codes for the gate roles (idempotent — already match the slug,
-- but pinned literally so any future label edit can't drift them)
UPDATE public.roles SET code = 'PROJECT_HUB_LEAD'    WHERE name = 'Project Hub Lead';
UPDATE public.roles SET code = 'DEP_PLANT_DIRECTOR'  WHERE name = 'Dep. Plant Director';
UPDATE public.roles SET code = 'CONSTRUCTION_LEAD'   WHERE name = 'Construction Lead';
UPDATE public.roles SET code = 'COMMISSIONING_LEAD'  WHERE name = 'Commissioning Lead';
UPDATE public.roles SET code = 'ORA_LEAD'            WHERE name = 'ORA Lead';

-- Pre-constraint verification: no nulls, no duplicates, all codes valid format
DO $$
DECLARE
  null_count int;
  dup_count  int;
  bad_format int;
BEGIN
  SELECT count(*) INTO null_count FROM public.roles WHERE code IS NULL OR btrim(code) = '';
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Mig 5b abort: % roles have null/blank code after back-fill', null_count;
  END IF;

  SELECT count(*) INTO dup_count FROM (
    SELECT code FROM public.roles GROUP BY code HAVING count(*) > 1
  ) d;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Mig 5b abort: % duplicate codes after slug back-fill (TA2 merge should have closed this)', dup_count;
  END IF;

  SELECT count(*) INTO bad_format FROM public.roles WHERE code !~ '^[A-Z][A-Z0-9_]*$';
  IF bad_format > 0 THEN
    RAISE EXCEPTION 'Mig 5b abort: % roles have codes that violate format ^[A-Z][A-Z0-9_]*$', bad_format;
  END IF;
END$$;

ALTER TABLE public.roles
  ALTER COLUMN code SET NOT NULL,
  ADD CONSTRAINT roles_code_key UNIQUE (code),
  ADD CONSTRAINT roles_code_format_chk CHECK (code ~ '^[A-Z][A-Z0-9_]*$');

CREATE INDEX IF NOT EXISTS roles_code_idx ON public.roles (code);

-- ---------- C) current_user_has_role_code helper ------------

-- TODO(multi-role): today profiles.role is a single UUID (one domain role per
-- user). If a future migration introduces user_role_assignments (per-user-per-
-- project membership), the BODY of this function widens to a join over that
-- table; the SIGNATURE (text in, boolean out) stays the same so call-sites in
-- RLS policies do not change. Caller identity stays hard-pinned to auth.uid().

CREATE OR REPLACE FUNCTION public.current_user_has_role_code(_role_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
      JOIN public.roles    r ON r.id = p.role
     WHERE p.user_id = auth.uid()
       AND r.code   = _role_code
  );
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_has_role_code(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.current_user_has_role_code(text) TO authenticated;

COMMENT ON FUNCTION public.current_user_has_role_code(text) IS
  'Returns true iff the calling auth.uid() holds the role identified by _role_code (matched on roles.code, NOT roles.name). Caller identity is hard-pinned; do NOT add a user_id parameter.';

-- ---------- D) Post-apply audit ------

DO $$
DECLARE
  total_roles  int;
  ta2_winner   text;
  ta2_loser    int;
  gate_codes   int;
BEGIN
  SELECT count(*) INTO total_roles FROM public.roles;
  SELECT name     INTO ta2_winner  FROM public.roles WHERE id = 'b7c14fae-6856-4024-a0b1-c048b20e7d59';
  SELECT count(*) INTO ta2_loser   FROM public.roles WHERE id = 'ac14d17b-659c-4fe8-bf31-07314c15e052';
  SELECT count(*) INTO gate_codes  FROM public.roles
    WHERE code IN ('PROJECT_HUB_LEAD','DEP_PLANT_DIRECTOR','CONSTRUCTION_LEAD','COMMISSIONING_LEAD','ORA_LEAD');

  RAISE NOTICE 'Mig 5b audit: total roles=%, TA2 winner name="%", TA2 loser rows=% (expect 0), gate codes present=% (expect 5)',
    total_roles, ta2_winner, ta2_loser, gate_codes;

  IF ta2_winner <> 'Process TA2 - Asset' OR ta2_loser <> 0 OR gate_codes <> 5 THEN
    RAISE EXCEPTION 'Mig 5b audit failed — see notice above';
  END IF;
END$$;

COMMIT;
