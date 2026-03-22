

# Fix 11 Database Functions with Mutable search_path

## Problem

The Supabase security linter flags 11 `public` schema functions that lack `SET search_path = public`, making them vulnerable to search path injection attacks.

## Affected Functions

| # | Function | Type | Security Definer |
|---|----------|------|-----------------|
| 1 | `calculate_milestone_progress()` | trigger | No |
| 2 | `calculate_orm_milestone_progress()` | trigger | No |
| 3 | `get_category_ref_id(text)` | immutable | No |
| 4 | `log_p2a_audit_trail()` | trigger | Yes |
| 5 | `reorder_checklist_item(text, integer)` | void | Yes |
| 6 | `update_ai_user_context_timestamp()` | trigger | No |
| 7 | `update_annotation_updated_at()` | trigger | No |
| 8 | `update_chat_conversation_updated_at()` | trigger | No |
| 9 | `update_projects_updated_at()` | trigger | No |
| 10 | `update_readiness_node_timestamp()` | trigger | No |
| 11 | `update_updated_at_column()` | trigger | No |

## Fix

Single migration that re-creates all 11 functions with `SET search_path = public` added to each definition. The function bodies remain identical — only the `SET search_path` clause is added.

For example:
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
```

Functions #4 and #5 (`log_p2a_audit_trail`, `reorder_checklist_item`) retain their `SECURITY DEFINER` attribute alongside the new `SET search_path`.

## Verification

After applying the migration, re-run the Supabase linter to confirm all 11 "Function Search Path Mutable" warnings are resolved.

## Files

| File | Action |
|------|--------|
| `supabase/migrations/xxx_fix_search_path.sql` | Create — single migration with 11 `CREATE OR REPLACE FUNCTION` statements |

