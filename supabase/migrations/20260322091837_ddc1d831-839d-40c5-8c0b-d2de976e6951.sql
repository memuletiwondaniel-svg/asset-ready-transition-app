DO $$
DECLARE
  pol RECORD;
  new_qual TEXT;
  new_check TEXT;
  role_str TEXT;
  qual_clause TEXT;
  check_clause TEXT;
  pol_type TEXT;
  counter INT := 0;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
  LOOP
    new_qual := replace(pol.qual, 'auth.uid()', '(select auth.uid())');
    new_check := replace(pol.with_check, 'auth.uid()', '(select auth.uid())');

    role_str := array_to_string(pol.roles, ', ');

    qual_clause := CASE WHEN pol.qual IS NOT NULL 
      THEN ' USING (' || new_qual || ')' ELSE '' END;
    check_clause := CASE WHEN pol.with_check IS NOT NULL 
      THEN ' WITH CHECK (' || new_check || ')' ELSE '' END;

    pol_type := CASE WHEN pol.permissive = 'PERMISSIVE' 
      THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;

    EXECUTE format('DROP POLICY %I ON %I.%I', 
      pol.policyname, pol.schemaname, pol.tablename);

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS ' || pol_type || 
      ' FOR ' || pol.cmd || ' TO ' || role_str || 
      qual_clause || check_clause,
      pol.policyname, pol.schemaname, pol.tablename
    );

    counter := counter + 1;
  END LOOP;

  RAISE NOTICE 'Updated % RLS policies', counter;
END $$;