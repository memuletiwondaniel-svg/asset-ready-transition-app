

# Consolidate Multiple Permissive RLS Policies

## Problem

The Supabase advisor flags "Multiple Permissive Policies" when a table has more than one permissive policy for the same role and operation. Postgres ORs these together, which can cause unintended access widening. There are **100 overlapping cases** across **~90 tables**, falling into two categories.

## Scope

### Category A: ALL + Specific Command Overlaps (88 tables)

Tables have an `ALL` policy (which covers SELECT/INSERT/UPDATE/DELETE) plus separate specific-command policies for the same role. Example: `commission` has "Admin users can manage commissions" (ALL, public) plus "All users can view active commissions" (SELECT, public).

**Fix**: Replace each ALL policy with individual per-command policies (INSERT, UPDATE, DELETE only) for commands that don't already have their own policy. The ALL policy's USING/WITH CHECK clauses carry over. Commands that already have specific policies keep their existing policy unchanged.

### Category B: Direct Duplicate Commands (3 tables, 5 groups)

| Table | Command | Role | Policies | Fix |
|-------|---------|------|----------|-----|
| `profiles` | SELECT | authenticated | 3 policies (admin, tenant, own) | Already OR'd correctly — drop "Users can view only their own profile" since "Tenant: view profiles" already includes `user_id = auth.uid()` in its OR condition |
| `projects` | SELECT | public | "All users can view projects" + "Anyone can view active projects" | Identical `is_active = true` — drop duplicate |
| `projects` | INSERT | authenticated | 3 policies (permission, tenant, owner) | Consolidate into single policy with combined WITH CHECK |
| `projects` | UPDATE | authenticated | 3 policies (tenant, delete-named, update) | "Users can delete their own projects" and "Users can update their own projects" have same qual — drop the misnamed one |
| `pssrs` | INSERT | authenticated | 2 policies (permission, tenant) | Consolidate into single WITH CHECK using OR |

## Migration Approach

A single migration file with two parts:

**Part 1 — Dynamic ALL→specific split**: A PL/pgSQL DO block that iterates all ALL policies, checks which specific commands already exist for the same table+role, drops the ALL policy, and creates individual policies for the missing commands only.

**Part 2 — Manual duplicate consolidation**: Explicit DROP/CREATE statements for the 5 direct-duplicate groups listed above.

## Technical Detail

The ALL→specific split logic:

```text
For each ALL policy:
  commands_with_existing_policy = SELECT cmd FROM pg_policies 
    WHERE same table+role AND cmd != 'ALL'
  
  For each cmd in {SELECT, INSERT, UPDATE, DELETE}:
    IF cmd NOT IN commands_with_existing_policy:
      CREATE POLICY "original_name (cmd)" ... FOR cmd ...
  
  DROP the ALL policy
```

This preserves the ALL policy's access logic but splits it into non-overlapping per-command policies.

## Files

| File | Action |
|------|--------|
| New migration SQL | Create — single file with dynamic ALL-split + manual duplicate consolidation |

## Expected Outcome

- ~100 policy overlaps resolved
- ALL policies replaced with per-command equivalents
- Direct duplicates consolidated
- Zero "Multiple Permissive Policies" warnings in Supabase advisor

