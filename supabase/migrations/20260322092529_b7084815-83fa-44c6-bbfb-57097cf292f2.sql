
-- =============================================================
-- Part 1: Split ALL policies into per-command policies
-- =============================================================
DO $$
DECLARE
  pol RECORD;
  existing_cmds TEXT[];
  cur_cmd TEXT;
  cmds TEXT[] := ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  qual_clause TEXT;
  check_clause TEXT;
  pol_type TEXT;
  role_str TEXT;
  counter INT := 0;
BEGIN
  FOR pol IN
    SELECT p.schemaname, p.tablename, p.policyname, p.cmd AS policy_cmd, p.permissive, p.roles, p.qual, p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.cmd = 'ALL'
  LOOP
    SELECT array_agg(p2.cmd)
    INTO existing_cmds
    FROM pg_policies p2
    WHERE p2.schemaname = pol.schemaname
      AND p2.tablename = pol.tablename
      AND p2.roles = pol.roles
      AND p2.cmd != 'ALL';

    IF existing_cmds IS NULL THEN
      existing_cmds := ARRAY[]::TEXT[];
    END IF;

    role_str := array_to_string(pol.roles, ', ');
    pol_type := CASE WHEN pol.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;

    FOREACH cur_cmd IN ARRAY cmds LOOP
      IF NOT (cur_cmd = ANY(existing_cmds)) THEN
        qual_clause := CASE WHEN pol.qual IS NOT NULL
          THEN ' USING (' || pol.qual || ')' ELSE '' END;

        IF cur_cmd IN ('SELECT', 'DELETE') THEN
          check_clause := '';
        ELSIF cur_cmd = 'INSERT' THEN
          qual_clause := '';
          check_clause := CASE WHEN pol.with_check IS NOT NULL
            THEN ' WITH CHECK (' || pol.with_check || ')'
            WHEN pol.qual IS NOT NULL
            THEN ' WITH CHECK (' || pol.qual || ')'
            ELSE '' END;
        ELSE
          check_clause := CASE WHEN pol.with_check IS NOT NULL
            THEN ' WITH CHECK (' || pol.with_check || ')' ELSE '' END;
        END IF;

        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS ' || pol_type ||
          ' FOR ' || cur_cmd || ' TO ' || role_str ||
          qual_clause || check_clause,
          pol.policyname || ' (' || cur_cmd || ')',
          pol.schemaname, pol.tablename
        );
        counter := counter + 1;
      END IF;
    END LOOP;

    EXECUTE format('DROP POLICY %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;

  RAISE NOTICE 'Part 1: Created % per-command policies from ALL policies', counter;
END $$;

-- =============================================================
-- Part 2: Consolidate direct duplicate policies
-- =============================================================

DROP POLICY IF EXISTS "Users can view only their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view active projects" ON public.projects;

DROP POLICY IF EXISTS "Permission: create projects" ON public.projects;
DROP POLICY IF EXISTS "Tenant: insert projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

CREATE POLICY "Authenticated users can insert projects" ON public.projects
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    has_permission((select auth.uid()), 'create_project'::app_permission)
    OR (tenant_id = get_user_tenant_id()) OR (tenant_id IS NULL)
    OR ((select auth.uid()) = created_by)
  );

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

DROP POLICY IF EXISTS "Permission: create PSSRs" ON public.pssrs;
DROP POLICY IF EXISTS "Tenant: insert pssrs" ON public.pssrs;

CREATE POLICY "Authenticated users can insert pssrs" ON public.pssrs
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    (((select auth.uid()) = user_id) AND has_permission((select auth.uid()), 'create_pssr'::app_permission))
    OR (tenant_id = get_user_tenant_id()) OR (tenant_id IS NULL)
  );
