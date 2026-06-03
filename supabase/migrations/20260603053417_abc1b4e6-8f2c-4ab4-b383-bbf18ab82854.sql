ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.roles.is_global IS
  'True when this role has a single org-wide holder that implicitly covers every project. resolve_project_role_user falls back to org_role_holders when no per-project assignment exists.';

CREATE TABLE IF NOT EXISTS public.org_role_holders (
  role_id      uuid PRIMARY KEY REFERENCES public.roles(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  assigned_by  uuid,
  notes        text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.org_role_holders IS
  'Org-wide holder for each role flagged roles.is_global = true. One row per global role.';

GRANT SELECT ON public.org_role_holders TO authenticated;
GRANT ALL ON public.org_role_holders TO service_role;

ALTER TABLE public.org_role_holders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read org role holders"
  ON public.org_role_holders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage org role holders"
  ON public.org_role_holders
  FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()))
  WITH CHECK (public.user_is_admin(auth.uid()));

CREATE TRIGGER trg_org_role_holders_updated_at
  BEFORE UPDATE ON public.org_role_holders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

UPDATE public.roles
   SET is_global = true
 WHERE name IN ('ORA Lead', 'P&M Director', 'P&E Director', 'HSE Director')
   AND is_active = true
   AND is_retired = false;

INSERT INTO public.org_role_holders (role_id, user_id)
SELECT r.id, '0c8134fd-7bde-491c-be5a-96b3a63c048c'::uuid
  FROM public.roles r WHERE r.name = 'ORA Lead'
UNION ALL
SELECT r.id, '0dae95bb-6cdb-491d-ac4c-4c0cd7b2e8b2'::uuid
  FROM public.roles r WHERE r.name = 'P&M Director'
UNION ALL
SELECT r.id, 'bd8dd7af-6bd4-4ca5-99ca-20bd53e38b4e'::uuid
  FROM public.roles r WHERE r.name = 'P&E Director'
UNION ALL
SELECT r.id, '52d07b04-bd60-4980-9f78-f2353b1bcbf9'::uuid
  FROM public.roles r WHERE r.name = 'HSE Director'
ON CONFLICT (role_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.resolve_project_role_user(p_project_id uuid, p_role_label text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   uuid;
  v_role_id   uuid;
  v_is_global boolean;
BEGIN
  IF p_project_id IS NULL OR p_role_label IS NULL OR length(btrim(p_role_label)) = 0 THEN
    RETURN NULL;
  END IF;

  -- 1) Per-project assignment wins (allows override).
  SELECT ptm.user_id INTO v_user_id
    FROM public.project_team_members ptm
    JOIN public.roles r ON r.name = ptm.role
   WHERE ptm.project_id = p_project_id
     AND ptm.role       = p_role_label
     AND r.is_active    = true
     AND r.is_retired   = false
   LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  -- 2) Fallback: org-level holder if the role is flagged global.
  SELECT r.id, r.is_global
    INTO v_role_id, v_is_global
    FROM public.roles r
   WHERE r.name       = p_role_label
     AND r.is_active  = true
     AND r.is_retired = false
   LIMIT 1;

  IF v_is_global IS TRUE THEN
    SELECT orh.user_id INTO v_user_id
      FROM public.org_role_holders orh
     WHERE orh.role_id = v_role_id
     LIMIT 1;
  END IF;

  RETURN v_user_id;
END;
$function$;