
-- 1. roles.scope
DO $$ BEGIN
  CREATE TYPE public.role_scope AS ENUM ('project','hub','plant','portfolio','org');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS scope public.role_scope NOT NULL DEFAULT 'project';

UPDATE public.roles SET scope='portfolio'
 WHERE name IN ('Sr ORA Engr','ORA Engr.','Construction Lead','Commissioning Lead','Project Manager');
UPDATE public.roles SET scope='hub'
 WHERE name IN ('Project Hub Lead','Project Engr','BFM Lead','BFM Project Engr');
UPDATE public.roles SET scope='plant'
 WHERE name IN ('Dep. Plant Director','Plant Director');
UPDATE public.roles SET scope='org'
 WHERE name IN ('ORA Lead','P&M Director','P&E Director','HSE Director','HSE Manager',
                'Engr. Manager','Engr. Manager (Asset)','Engr. Manager (Project)',
                'ER Manager','ER Adviser','Mtce Director','CMMS Lead');

INSERT INTO public.roles (name, code, scope, is_active, is_retired)
 VALUES ('Additional Team Member','ADDITIONAL_TEAM_MEMBER','project',true,false)
 ON CONFLICT (code) DO NOTHING;

-- 2. Roster tables
CREATE TABLE IF NOT EXISTS public.region_role_holders (
  region_id uuid NOT NULL REFERENCES public.project_region(id) ON DELETE CASCADE,
  role_id   uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  PRIMARY KEY (region_id, role_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.hub_role_holders (
  hub_id  uuid NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  PRIMARY KEY (hub_id, role_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.plant_role_holders (
  plant_id uuid NOT NULL REFERENCES public.plant(id) ON DELETE CASCADE,
  role_id  uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  PRIMARY KEY (plant_id, role_id, user_id)
);

GRANT SELECT ON public.region_role_holders TO authenticated;
GRANT ALL    ON public.region_role_holders TO service_role;
GRANT SELECT ON public.hub_role_holders    TO authenticated;
GRANT ALL    ON public.hub_role_holders    TO service_role;
GRANT SELECT ON public.plant_role_holders  TO authenticated;
GRANT ALL    ON public.plant_role_holders  TO service_role;

ALTER TABLE public.region_role_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_role_holders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_role_holders  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read region roster" ON public.region_role_holders;
CREATE POLICY "read region roster" ON public.region_role_holders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin manage region roster" ON public.region_role_holders;
CREATE POLICY "admin manage region roster" ON public.region_role_holders FOR ALL TO authenticated
  USING (public.user_is_admin(auth.uid())) WITH CHECK (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "read hub roster" ON public.hub_role_holders;
CREATE POLICY "read hub roster" ON public.hub_role_holders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin manage hub roster" ON public.hub_role_holders;
CREATE POLICY "admin manage hub roster" ON public.hub_role_holders FOR ALL TO authenticated
  USING (public.user_is_admin(auth.uid())) WITH CHECK (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "read plant roster" ON public.plant_role_holders;
CREATE POLICY "read plant roster" ON public.plant_role_holders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin manage plant roster" ON public.plant_role_holders;
CREATE POLICY "admin manage plant roster" ON public.plant_role_holders FOR ALL TO authenticated
  USING (public.user_is_admin(auth.uid())) WITH CHECK (public.user_is_admin(auth.uid()));

-- 3. Resolver
CREATE OR REPLACE FUNCTION public.resolve_project_role_user(p_project_id uuid, p_role_label text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id uuid; v_scope public.role_scope; v_user uuid;
  v_region uuid; v_hub uuid; v_plant uuid;
BEGIN
  SELECT id, scope INTO v_role_id, v_scope FROM public.roles
   WHERE name = p_role_label AND is_active AND NOT is_retired LIMIT 1;
  IF v_role_id IS NULL THEN RETURN NULL; END IF;

  SELECT user_id INTO v_user FROM public.project_team_members
   WHERE project_id = p_project_id AND role = p_role_label
   ORDER BY created_at NULLS LAST, user_id LIMIT 1;
  IF v_user IS NOT NULL THEN RETURN v_user; END IF;

  IF v_scope = 'portfolio' THEN
    SELECT region_id INTO v_region FROM public.projects WHERE id = p_project_id;
    IF v_region IS NOT NULL THEN
      SELECT user_id INTO v_user FROM public.region_role_holders
       WHERE region_id = v_region AND role_id = v_role_id
       ORDER BY assigned_at, user_id LIMIT 1;
      IF v_user IS NOT NULL THEN RETURN v_user; END IF;
    END IF;
  ELSIF v_scope = 'hub' THEN
    SELECT hub_id INTO v_hub FROM public.projects WHERE id = p_project_id;
    IF v_hub IS NOT NULL THEN
      SELECT user_id INTO v_user FROM public.hub_role_holders
       WHERE hub_id = v_hub AND role_id = v_role_id
       ORDER BY assigned_at, user_id LIMIT 1;
      IF v_user IS NOT NULL THEN RETURN v_user; END IF;
    END IF;
  ELSIF v_scope = 'plant' THEN
    SELECT plant_id INTO v_plant FROM public.projects WHERE id = p_project_id;
    IF v_plant IS NOT NULL THEN
      SELECT user_id INTO v_user FROM public.plant_role_holders
       WHERE plant_id = v_plant AND role_id = v_role_id
       ORDER BY assigned_at, user_id LIMIT 1;
      IF v_user IS NOT NULL THEN RETURN v_user; END IF;
    END IF;
  END IF;

  SELECT user_id INTO v_user FROM public.org_role_holders
   WHERE role_id = v_role_id ORDER BY assigned_at, user_id LIMIT 1;
  RETURN v_user;
END;
$$;

-- 4. Backfill region_role_holders from profiles.position '– Region' suffix
WITH src AS (
  SELECT p.user_id, r.id AS role_id, reg.id AS region_id
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role AND r.scope = 'portfolio'
    JOIN public.project_region reg
      ON reg.is_active
     AND (p.position ILIKE '%– ' || reg.name || '%'
       OR p.position ILIKE '%- ' || reg.name || '%')
   WHERE p.is_active
)
INSERT INTO public.region_role_holders (region_id, role_id, user_id)
SELECT region_id, role_id, user_id FROM src
ON CONFLICT DO NOTHING;

-- 5a. Dedupe — delete dirty rows whose canonical equivalent already exists
DELETE FROM public.project_team_members a
 USING public.project_team_members b
 WHERE a.project_id = b.project_id
   AND a.user_id    = b.user_id
   AND (
        (a.role='Snr. ORA Engr.'         AND b.role='Sr ORA Engr')
     OR (a.role='Deputy Plant Director'  AND b.role='Dep. Plant Director')
     OR (a.role='Project Engineer'       AND b.role='Project Engr')
   );

-- 5b. Normalize remaining dirty rows
UPDATE public.project_team_members SET role='Sr ORA Engr'         WHERE role='Snr. ORA Engr.';
UPDATE public.project_team_members SET role='Dep. Plant Director' WHERE role='Deputy Plant Director';
UPDATE public.project_team_members SET role='Project Engr'        WHERE role='Project Engineer';

-- 6. Verify 100% match then install validation trigger
DO $verify$
DECLARE v_bad int;
BEGIN
  SELECT count(*) INTO v_bad FROM public.project_team_members ptm
   WHERE NOT EXISTS (SELECT 1 FROM public.roles r
                      WHERE r.name = ptm.role AND r.is_active AND NOT r.is_retired);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'project_team_members has % role rows not matching roles.name — aborting trigger install', v_bad;
  END IF;
END $verify$;

CREATE OR REPLACE FUNCTION public.validate_project_team_member_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.roles
                  WHERE name = NEW.role AND is_active AND NOT is_retired) THEN
    RAISE EXCEPTION 'project_team_members.role % is not a canonical active role label', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ptm_role ON public.project_team_members;
CREATE TRIGGER trg_validate_ptm_role
BEFORE INSERT OR UPDATE OF role ON public.project_team_members
FOR EACH ROW EXECUTE FUNCTION public.validate_project_team_member_role();

-- 7. DPD back-compat shim — plant roster first, fall back to position string
CREATE OR REPLACE FUNCTION public.find_deputy_plant_director(plant_name_param text)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plant_id uuid; v_role_id uuid;
BEGIN
  SELECT id INTO v_plant_id FROM public.plant WHERE name ILIKE plant_name_param LIMIT 1;
  SELECT id INTO v_role_id  FROM public.roles
   WHERE name='Dep. Plant Director' AND is_active AND NOT is_retired LIMIT 1;

  IF v_plant_id IS NOT NULL AND v_role_id IS NOT NULL THEN
    RETURN QUERY
    SELECT prh.user_id, p.full_name, p.avatar_url
      FROM public.plant_role_holders prh
      JOIN public.profiles p ON p.user_id = prh.user_id
     WHERE prh.plant_id = v_plant_id AND prh.role_id = v_role_id
     ORDER BY prh.assigned_at LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.full_name, p.avatar_url
    FROM public.profiles p
   WHERE p.is_active
     AND (p.position ILIKE '%Dep. Plant Director - '    || plant_name_param || '%'
       OR p.position ILIKE '%Deputy Plant Director - ' || plant_name_param || '%')
   LIMIT 1;
END;
$$;
