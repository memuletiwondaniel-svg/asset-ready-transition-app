

# Wrap `auth.uid()` in RLS Policies for Performance

## Problem

The Supabase Performance Advisor flags "Auth RLS Initialization Plan" warnings because RLS policies call `auth.uid()` directly. Postgres evaluates this once per row. Wrapping it as `(select auth.uid())` makes Postgres evaluate it once per query as a subquery constant, significantly improving performance at scale.

## Scope

- **416 RLS policies** across **~150 tables** use bare `auth.uid()`
- **0 policies** use `auth.jwt()` (no changes needed there)
- **0 policies** are already wrapped

## Approach

Generate a single migration that:

1. Queries `pg_policies` for all policies in the `public` schema containing `auth.uid()`
2. For each policy, drops it and recreates it with all occurrences of `auth.uid()` replaced by `(select auth.uid())`
3. Preserves policy name, table, command type, roles, permissive/restrictive qualifier, USING clause, and WITH CHECK clause

The migration will use a PL/pgSQL `DO` block that programmatically iterates over all affected policies using `pg_policies` metadata, performs the text replacement, drops each policy, and recreates it. This avoids manually writing 416 individual DROP/CREATE statements and ensures no policy is missed.

### Key technical detail

The replacement is a simple text substitution: `auth.uid()` → `(select auth.uid())`. This is safe because:
- `auth.uid()` always appears as a function call, never as a substring of another identifier
- The subquery form `(select auth.uid())` is semantically identical but tells the planner to cache the result

## Migration SQL (single file)

```sql
DO $$
DECLARE
  pol RECORD;
  new_qual TEXT;
  new_check TEXT;
  cmd_str TEXT;
  role_str TEXT;
  qual_clause TEXT;
  check_clause TEXT;
  pol_type TEXT;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
  LOOP
    -- Replace auth.uid() with (select auth.uid())
    new_qual := replace(pol.qual, 'auth.uid()', '(select auth.uid())');
    new_check := replace(pol.with_check, 'auth.uid()', '(select auth.uid())');

    -- Build role string
    role_str := array_to_string(pol.roles, ', ');

    -- Build clauses
    qual_clause := CASE WHEN pol.qual IS NOT NULL 
      THEN ' USING (' || new_qual || ')' ELSE '' END;
    check_clause := CASE WHEN pol.with_check IS NOT NULL 
      THEN ' WITH CHECK (' || new_check || ')' ELSE '' END;

    -- Permissive type
    pol_type := CASE WHEN pol.permissive = 'PERMISSIVE' 
      THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;

    -- Drop and recreate
    EXECUTE format('DROP POLICY %I ON %I.%I', 
      pol.policyname, pol.schemaname, pol.tablename);

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS ' || pol_type || 
      ' FOR ' || pol.cmd || ' TO ' || role_str || 
      qual_clause || check_clause,
      pol.policyname, pol.schemaname, pol.tablename
    );
  END LOOP;
END $$;
```

## Files

| File | Action |
|------|--------|
| New migration SQL | Create — single DO block replacing `auth.uid()` with `(select auth.uid())` in all 416 policies |

## Expected outcome

- 416 policies updated in a single transaction
- Zero "Auth RLS Initialization Plan" warnings in the Supabase Advisor
- No functional changes — all policies behave identically, just faster

