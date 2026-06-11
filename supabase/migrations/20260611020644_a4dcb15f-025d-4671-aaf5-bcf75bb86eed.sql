
-- ──────────────────────────────────────────────────────────────────────
-- Mig STEP-3: Snr canonical rename (5 roles)
-- Atomic: rename roles.name + ptm.role + DB functions + RLS policies.
-- region_role_holders / org_role_holders are FK-by-role_id → transparent.
-- ──────────────────────────────────────────────────────────────────────

-- 1) Rename roles.name (role_id stable; FK consumers unaffected).
--    Order matters only relative to ptm: rename roles first so the
--    validation trigger sees the new canonical when ptm is updated.
UPDATE public.roles SET name='Snr ORA Engr'  WHERE name='Sr ORA Engr';
UPDATE public.roles SET name='ORA Engr'      WHERE name='ORA Engr.';
UPDATE public.roles SET name='CMMS Engr'     WHERE name='CMMS Engr.';
UPDATE public.roles SET name='Pipeline Engr' WHERE name='Pipeline Engr.';
UPDATE public.roles SET name='Site Engr'     WHERE name='Site Engr.';

-- 2) Update project_team_members.role text rows. Trigger
--    trg_validate_ptm_role checks NEW.role ∈ roles.name — passes
--    because step 1 already renamed.
UPDATE public.project_team_members SET role='Snr ORA Engr'  WHERE role='Sr ORA Engr';
UPDATE public.project_team_members SET role='ORA Engr'      WHERE role='ORA Engr.';
UPDATE public.project_team_members SET role='CMMS Engr'     WHERE role='CMMS Engr.';
UPDATE public.project_team_members SET role='Pipeline Engr' WHERE role='Pipeline Engr.';
UPDATE public.project_team_members SET role='Site Engr'     WHERE role='Site Engr.';

-- 3) Rewrite all functions whose body references the old strings.
--    Dynamic regen via pg_get_functiondef — surgical: only the literal
--    text changes. Functions: resolve_project_role_user callers
--    (auto_create_ora_*, create_p2a_*, create_vcr_*, sync_*_rejection_to_plan).
DO $rename_fns$
DECLARE r record;
        new_def text;
BEGIN
  FOR r IN
    SELECT p.oid, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND ( pg_get_functiondef(p.oid) LIKE '%''Sr ORA Engr''%'
         OR pg_get_functiondef(p.oid) LIKE '%''ORA Engr.''%'
         OR pg_get_functiondef(p.oid) LIKE '%''CMMS Engr.''%'
         OR pg_get_functiondef(p.oid) LIKE '%''Pipeline Engr.''%'
         OR pg_get_functiondef(p.oid) LIKE '%''Site Engr.''%' )
  LOOP
    new_def := r.def;
    new_def := replace(new_def, '''Sr ORA Engr''',     '''Snr ORA Engr''');
    new_def := replace(new_def, '''ORA Engr.''',       '''ORA Engr''');
    new_def := replace(new_def, '''CMMS Engr.''',      '''CMMS Engr''');
    new_def := replace(new_def, '''Pipeline Engr.''',  '''Pipeline Engr''');
    new_def := replace(new_def, '''Site Engr.''',      '''Site Engr''');
    EXECUTE new_def;
  END LOOP;
END
$rename_fns$;

-- 4) Drop+recreate every RLS policy whose USING/WITH CHECK references the
--    old role strings. Preserves polcmd, roles, qual, with-check; updates
--    the literal token in the expression AND in the policy name.
DO $rename_policies$
DECLARE r record;
        new_name text;
        new_qual text;
        new_wch  text;
        cmd_kw   text;
        roles_csv text;
BEGIN
  FOR r IN
    SELECT pol.polname,
           c.relname,
           pol.polcmd,
           pg_get_expr(pol.polqual,      pol.polrelid) AS qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) AS wch,
           (SELECT string_agg(quote_ident(rolname), ',')
              FROM pg_roles WHERE oid = ANY(pol.polroles)) AS roles_csv
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
      AND ( pg_get_expr(pol.polqual,      pol.polrelid) LIKE '%''Sr ORA Engr''%'
         OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%''Sr ORA Engr''%'
         OR pg_get_expr(pol.polqual,      pol.polrelid) LIKE '%''ORA Engr.''%'
         OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%''ORA Engr.''%'
         OR pg_get_expr(pol.polqual,      pol.polrelid) LIKE '%''CMMS Engr.''%'
         OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%''CMMS Engr.''%'
         OR pg_get_expr(pol.polqual,      pol.polrelid) LIKE '%''Pipeline Engr.''%'
         OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%''Pipeline Engr.''%'
         OR pg_get_expr(pol.polqual,      pol.polrelid) LIKE '%''Site Engr.''%'
         OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%''Site Engr.''%' )
  LOOP
    cmd_kw := CASE r.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                ELSE 'ALL' END;

    new_name := r.polname;
    new_name := replace(new_name, 'Sr ORA Engr',     'Snr ORA Engr');
    new_name := replace(new_name, 'ORA Engr.',       'ORA Engr');
    new_name := replace(new_name, 'CMMS Engr.',      'CMMS Engr');
    new_name := replace(new_name, 'Pipeline Engr.',  'Pipeline Engr');
    new_name := replace(new_name, 'Site Engr.',      'Site Engr');

    new_qual := r.qual;
    new_wch  := r.wch;
    IF new_qual IS NOT NULL THEN
      new_qual := replace(new_qual, '''Sr ORA Engr''',     '''Snr ORA Engr''');
      new_qual := replace(new_qual, '''ORA Engr.''',       '''ORA Engr''');
      new_qual := replace(new_qual, '''CMMS Engr.''',      '''CMMS Engr''');
      new_qual := replace(new_qual, '''Pipeline Engr.''',  '''Pipeline Engr''');
      new_qual := replace(new_qual, '''Site Engr.''',      '''Site Engr''');
    END IF;
    IF new_wch IS NOT NULL THEN
      new_wch := replace(new_wch, '''Sr ORA Engr''',     '''Snr ORA Engr''');
      new_wch := replace(new_wch, '''ORA Engr.''',       '''ORA Engr''');
      new_wch := replace(new_wch, '''CMMS Engr.''',      '''CMMS Engr''');
      new_wch := replace(new_wch, '''Pipeline Engr.''',  '''Pipeline Engr''');
      new_wch := replace(new_wch, '''Site Engr.''',      '''Site Engr''');
    END IF;

    EXECUTE format('DROP POLICY %I ON public.%I', r.polname, r.relname);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR %s TO %s %s %s',
      new_name,
      r.relname,
      cmd_kw,
      COALESCE(r.roles_csv, 'public'),
      CASE WHEN new_qual IS NOT NULL THEN 'USING ('||new_qual||')' ELSE '' END,
      CASE WHEN new_wch  IS NOT NULL THEN 'WITH CHECK ('||new_wch||')' ELSE '' END
    );
  END LOOP;
END
$rename_policies$;

-- 5) Sanity: assert zero remaining old strings anywhere we own.
DO $verify$
DECLARE
  bad_roles int;
  bad_ptm   int;
  bad_fns   int;
  bad_pols  int;
BEGIN
  SELECT count(*) INTO bad_roles FROM public.roles
   WHERE name IN ('Sr ORA Engr','ORA Engr.','CMMS Engr.','Pipeline Engr.','Site Engr.');
  SELECT count(*) INTO bad_ptm FROM public.project_team_members
   WHERE role IN ('Sr ORA Engr','ORA Engr.','CMMS Engr.','Pipeline Engr.','Site Engr.');
  SELECT count(*) INTO bad_fns FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public'
     AND ( pg_get_functiondef(p.oid) LIKE '%''Sr ORA Engr''%'
        OR pg_get_functiondef(p.oid) LIKE '%''ORA Engr.''%'
        OR pg_get_functiondef(p.oid) LIKE '%''CMMS Engr.''%'
        OR pg_get_functiondef(p.oid) LIKE '%''Pipeline Engr.''%'
        OR pg_get_functiondef(p.oid) LIKE '%''Site Engr.''%' );
  SELECT count(*) INTO bad_pols FROM pg_policy pol JOIN pg_class c ON c.oid=pol.polrelid
   WHERE c.relnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
     AND ( pg_get_expr(pol.polqual,      pol.polrelid) LIKE '%''Sr ORA Engr''%'
        OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%''Sr ORA Engr''%'
        OR pg_get_expr(pol.polqual,      pol.polrelid) LIKE '%''ORA Engr.''%'
        OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%''ORA Engr.''%' );

  IF bad_roles+bad_ptm+bad_fns+bad_pols > 0 THEN
    RAISE EXCEPTION 'STEP-3 rename incomplete: roles=%, ptm=%, fns=%, pols=%',
      bad_roles, bad_ptm, bad_fns, bad_pols;
  END IF;
END
$verify$;
