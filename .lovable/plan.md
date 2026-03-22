

# Remove Hardcoded Email/Personnel Patterns

## Problem

While the specific `ewan@ora.ai` admin email reference no longer exists in the codebase, several hardcoded personnel patterns remain that violate the principle of purely role-based access:

1. **`ORAApprovalsPanel.tsx`** — `ROLE_USER_MAPPING` maps approval roles to specific user emails (e.g., `roaa.abdullah@basrahgas.iq`, `ewan.mcconnachie2@basrahgas.iq`). Approvers should be resolved dynamically from the database by role.
2. **`UserProfileDropdown.tsx`** — Hardcodes `role: 'Administrator'` and `email: 'admin@bgc.com'` as fallbacks instead of fetching the user's actual role from `user_roles`/`profiles`.
3. **`useMyTasksMockData.ts`** — `ORSH_PERSONNEL` hardcodes real personnel names and emails. This is mock data but references real people, which is a data hygiene issue.
4. **`SOFQualificationsPanel.tsx`** / **`SOFCommentsPanel.tsx`** — Hardcoded reviewer names in mock/demo data.

## Changes

### 1. `ORAApprovalsPanel.tsx` — Dynamic approver resolution

Remove `ROLE_USER_MAPPING` constant. Instead, query the database for users by their role (via the `roles` table joined to `profiles`). The `APPROVAL_SEQUENCE` array of role names stays, but user resolution becomes a DB lookup:

```
profiles JOIN roles ON profiles.role = roles.id
WHERE roles.name IN ('ORA Lead', 'Project Manager', 'Deputy Plant Director', 'Plant Director')
```

This ensures that when personnel change, the UI automatically reflects the correct approvers.

### 2. `UserProfileDropdown.tsx` — Fetch real role from DB

Replace the mock user object with data from the authenticated user's profile and role. Use the existing `useCurrentUserRole` hook or query `profiles` + `user_roles` to get the actual role name, company, and department instead of hardcoding `'Administrator'`.

### 3. `useMyTasksMockData.ts` — Anonymize mock data

Replace real personnel names/emails with generic placeholders (e.g., "Director 1", "Engineer 1") or fetch assignee data from the database. Since this is mock data for the My Tasks page, genericizing the names is sufficient.

### 4. `SOFQualificationsPanel.tsx` / `SOFCommentsPanel.tsx` — Genericize demo data

Replace hardcoded reviewer names with role-based labels (e.g., "Deputy Plant Director" instead of "Ewan McConnachie") or fetch from the database if these panels use real data.

## Files

| File | Action |
|------|--------|
| `src/components/ora/ORAApprovalsPanel.tsx` | Modify — replace `ROLE_USER_MAPPING` with dynamic DB query by role |
| `src/components/admin/UserProfileDropdown.tsx` | Modify — fetch real role/profile instead of hardcoded mock |
| `src/hooks/useMyTasksMockData.ts` | Modify — anonymize personnel names/emails |
| `src/components/sof/SOFQualificationsPanel.tsx` | Modify — remove hardcoded reviewer name |
| `src/components/sof/SOFCommentsPanel.tsx` | Modify — remove hardcoded reviewer name |

