

# Fix Overly Permissive RLS Policies

## Problem
79 RLS policies use `USING (true)` or `WITH CHECK (true)` on write operations (INSERT/UPDATE/DELETE), allowing any authenticated user (or even `public` in some cases) to modify data without role verification.

## Existing Security Functions
The database already has these security definer functions:
- `user_is_admin(user_uuid uuid)` — checks `user_roles` for admin role
- `user_has_role(user_uuid uuid, role_name text)` — checks `user_roles` for any role
- `has_permission(_user_id uuid, _permission app_permission)` — checks `role_permissions` via profiles

## Strategy

Categorize the 79 policies into tiers and apply the appropriate check:

### Tier 1 — Admin-only configuration tables (DMS, ORA catalog)
Restrict to admin OR moderator. These are reference/master data tables.

**Tables (30 policies):** `dms_disciplines`, `dms_document_types`, `dms_document_type_secondary_disciplines`, `dms_numbering_segments`, `dms_originators`, `dms_plants`, `dms_projects`, `dms_sites`, `dms_status_codes`, `dms_units`, `ora_activity_catalog`, `ora_plan_templates`, `ora_training_system_mappings`, `project_hub_region`, `project_locations`

**Check:** `public.user_is_admin(auth.uid()) OR public.user_has_role(auth.uid(), 'moderator')`

### Tier 2 — Permission-gated operational tables (P2A/VCR workflow)
Restrict to users with the relevant `app_permission`.

| Tables | Permission |
|--------|-----------|
| `p2a_vcr_critical_docs`, `p2a_vcr_deliverables`, `p2a_vcr_documentation`, `p2a_vcr_item_overrides`, `p2a_vcr_logsheets`, `p2a_vcr_operational_registers`, `p2a_vcr_procedures`, `p2a_vcr_register_selections`, `p2a_vcr_relationships`, `p2a_vcr_training`, `vcr_discipline_assurance`, `vcr_item_delivering_parties`, `p2a_itp_activities` | `manage_p2a` |
| `p2a_approver_history`, `p2a_audit_trail` | `manage_p2a` (INSERT only, keep append-only) |
| `outstanding_work_items` | `manage_p2a` |
| `orm_notifications`, `orm_plans` | `manage_orm` |
| `pac_prerequisite_delivering_parties`, `pac_prerequisite_receiving_parties` | `manage_p2a` |
| `pssr_approvers`, `pssr_selected_ati_scopes`, `pssr_walkdown_attendees` | `create_pssr` |
| `sof_approvers`, `sof_certificates` | `approve_sof` |

### Tier 3 — System/audit tables
- `audit_logs` INSERT — keep `WITH CHECK (true)` for authenticated (this is correct; audit logs must always be writable)
- `orp_activity_log`, `orp_approval_history` — system INSERT by `public` role — these are called from edge functions with service_role, keep as-is but change role target from `public` to `service_role`
- `tenants` — already scoped to `service_role`, no change needed

### Special case: `public` role policies
Several policies target `{public}` role (unauthenticated). These are the most critical to fix:
- `orm_notifications`, `orm_plans`, `orp_activity_log`, `orp_approval_history`, `p2a_audit_trail` — change to `authenticated` + permission check (or `service_role` for system-generated inserts)
- `p2a_vcr_deliverables`, `p2a_vcr_documentation`, `p2a_vcr_operational_registers`, `p2a_vcr_procedures`, `p2a_vcr_training` — change from `public` to `authenticated` + `manage_p2a` check
- `pssr_approvers`, `pssr_walkdown_attendees`, `sof_approvers`, `sof_certificates` — change from `public` to `authenticated` + permission check

## Implementation

Single migration file that:
1. Drops each permissive policy by name
2. Re-creates it with the correct `USING` / `WITH CHECK` clause and correct role target
3. Ensures `search_path` is set on any referenced function

Approximately 75 DROP + CREATE POLICY statements in one migration. The `audit_logs` INSERT policy and `tenants` service_role policy remain unchanged.

## Risk Mitigation
- All checks use existing `SECURITY DEFINER` functions (`user_is_admin`, `user_has_role`, `has_permission`) — no recursive RLS risk
- SELECT policies are not touched — read access remains unchanged
- Edge functions using `service_role` key bypass RLS entirely, so system-generated inserts continue working

