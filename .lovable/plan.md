

## Full RBAC Implementation Plan

### Current State

Your app has fragmented access control:
- **`user_roles` table** — stores system-level roles (`admin`, `moderator`, `user`) 
- **`roles` table** — stores job titles (ORA Engineer, Plant Director, etc.) referenced by profiles
- **`user_privileges` table** — stores granular privileges (`view_only`, `complete_assigned_tasks`, etc.)
- **Hardcoded checks** scattered across components (`useCanCreateVCR`, `useIsDirector`, `useCanPerformActions`) with role name string matching
- No centralized permission matrix — each feature independently decides who has access

### What We Will Build

#### 1. Permission Matrix Table (Database)

A new `role_permissions` table mapping job roles (from the `roles` table) to specific permissions:

```text
role_permissions
├── id (uuid)
├── role_id (uuid → roles.id)
├── permission (enum: create_project, create_vcr, create_pssr, approve_pssr, 
│                      approve_sof, manage_users, access_admin, view_reports,
│                      create_ora_plan, manage_p2a, manage_orm)
├── granted_by (uuid)
├── created_at (timestamptz)
└── UNIQUE(role_id, permission)
```

A security definer function `has_permission(user_id, permission)` that checks if the user's assigned role has a given permission — replacing all hardcoded role-name checks.

#### 2. Centralized Permission Hook (Frontend)

Replace `useCanCreateVCR`, `useIsDirector`, `useCanPerformActions` with a single hook:

```typescript
const { hasPermission, isLoading } = usePermissions();

// Usage anywhere:
if (hasPermission('create_vcr')) { ... }
if (hasPermission('access_admin')) { ... }
if (hasPermission('create_project')) { ... }
```

This hook fetches the user's role permissions once and caches them.

#### 3. Admin UI — Role Permissions Manager

A new "Roles & Permissions" card in Admin Tools with:
- **Role list** on the left (from `roles` table, grouped by category)
- **Permission checkboxes** on the right — toggle which permissions each role has
- Visual matrix view showing all roles × all permissions
- Changes saved immediately to `role_permissions` table

#### 4. Strengthen RLS Policies

Add a `has_permission()` security definer function used in RLS policies:
- Projects table: `has_permission(auth.uid(), 'create_project')` for INSERT
- PSSRs table: `has_permission(auth.uid(), 'create_pssr')` for INSERT
- Admin-only tables: `has_permission(auth.uid(), 'access_admin')` for all operations

#### 5. Migrate Existing Hardcoded Rules

Seed the `role_permissions` table with your current implicit rules:
- ORA Engineers/Leads → `create_vcr`
- Directors → `view_reports`, `approve_sof` (but NOT `create_project`, `create_pssr`)
- All non-director roles → `create_project`, `create_pssr`
- Admin users → `access_admin`, `manage_users`

Then refactor existing components to use the new `usePermissions()` hook.

### Technical Summary

| Step | What | Type |
|------|------|------|
| 1 | Create `permission` enum + `role_permissions` table + `has_permission()` function | DB Migration |
| 2 | Seed initial permission assignments based on current rules | DB Insert |
| 3 | Create `usePermissions` hook | Frontend |
| 4 | Build Role Permissions Manager UI under Admin Tools | Frontend |
| 5 | Refactor existing components to use `usePermissions()` | Frontend |
| 6 | Add RLS policies using `has_permission()` | DB Migration |

### Files to Create/Modify

- **New**: `src/hooks/usePermissions.ts`
- **New**: `src/components/admin-tools/RolePermissionsManager.tsx`
- **Modify**: `src/components/AdminToolsPage.tsx` — add Roles & Permissions card
- **Modify**: `src/components/project/ProjectsHomePage.tsx` — use `usePermissions`
- **Modify**: `src/components/widgets/PSSRSummaryWidget.tsx` — use `usePermissions`
- **Modify**: `src/components/widgets/PSSRQuickActionsWidget.tsx` — use `usePermissions`
- **New**: Migration for `role_permissions` table, enum, and functions

