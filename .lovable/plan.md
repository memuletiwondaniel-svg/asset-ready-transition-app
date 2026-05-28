## Corrected understanding

- The "Good morning, Daniel" home page IS the current/correct authenticated home — keep it.
- Pages to permanently remove (route + component + nav references):
  - `/my-backlog` — stale Kanban (`BacklogPage.tsx`); correct page is `/my-tasks`.
  - `/manage-checklist` — stale, falls back to home.
  - `/vcrs` — stale, falls back to home.
  - `/pssr/approver-dashboard` and `/pssr-reviews` — stale; correct destination is `/my-tasks`.
  - `/pssr/:id/sof` — stale SoF review page; shows "Failed to load SoF certificate" and is no longer wired.
  - `/p2o` — referenced by the user as a stale route; remove every link/redirect that points to it (route is not currently registered in `App.tsx`, so this is a sweep-only item).
- `/users` page is correct content but wrong URL — move to `/admin/users`, breadcrumb becomes `Home › Admin › Users`.
- The "stale ORSH copy after inactivity" symptom is a stale-bundle / cache issue that needs an end-to-end permanent fix.

## Changes

### 1. Permanently delete stale pages and routes

For each path below, remove the `<Route>` in `src/App.tsx`, delete the page component if not used elsewhere, scrub every navigation / favorites / sidebar / translation reference, and replace the route with a redirect so old bookmarks land somewhere sensible instead of NotFound.

| Old path | Page file to delete (if unused) | Redirect target |
|---|---|---|
| `/my-backlog` | `src/pages/BacklogPage.tsx`, `src/hooks/usePersonalBacklog.ts`, `src/hooks/useBacklogGroups.ts` | `/my-tasks` |
| `/manage-checklist` | Sidebar/index branch only (no dedicated page file) | `/home` |
| `/vcrs` | Sidebar/index branch only | `/projects` |
| `/pssr/approver-dashboard` | `src/pages/PSSRApproverDashboard.tsx` (also drop the import) | `/my-tasks` |
| `/pssr-reviews` | — (alias of the above) | `/my-tasks` |
| `/pssr/:id/sof` | `src/pages/SoFReviewPage.tsx` | `/my-tasks` |
| `/p2o` | — (sweep references only) | `/home` |

Sweep tasks shared by all of the above:
- Remove matching entries from `src/utils/sidebarNavigation.ts` (`SIDEBAR_ROUTES`), `src/components/OrshSidebar.tsx`, `src/components/layouts/AuthenticatedLayout.tsx` `currentPage` matcher, `src/pages/Index.tsx` page-branch switch, `src/components/LandingPage.tsx` favorites icon map, and any translation keys (e.g. `navManageChecklist`, `navVCRs`, `navPSSRReviews`).
- Strip these paths from persisted user data on boot inside `src/lib/app-reset.ts`: clean `orsh-favorites-*`, `orsh-admin-favorites-*`, and any "last route" key.

### 2. Move User Management `/users` → `/admin/users`

- `src/App.tsx`: change the route from `path="/users"` to `path="/admin/users"`; add `<Route path="/users" element={<Navigate to="/admin/users" replace />} />` so old links don't 404.
- `src/utils/sidebarNavigation.ts`: update `users` and `user-management` entries to `/admin/users`.
- `src/components/layouts/AuthenticatedLayout.tsx`: update the matcher from `startsWith('/users')` to `startsWith('/admin/users')`.
- `src/pages/UserManagement.tsx` + `src/pages/Index.tsx` branch: set breadcrumb to `Home › Admin › Users` (replacing today's `Home › User Management`). "Admin" is non-clickable; "Users" is the current page.

### 3. Permanent fix for the post-inactivity stale ORSH copy

Earlier attempts (`runResetIfNeeded`, version-check polling, pre-mount spinner) narrowed the window but didn't close it. The remaining hole: after a long idle period the tab wakes with the old in-memory bundle and the SPA renders without ever refetching `index.html`. End-to-end fix:

- **Pre-React head guard in `index.html`**: inline `<script>` in `<head>` (before any module import) that unregisters every service worker, deletes every Cache Storage entry, then compares `<meta name="app-build">` from the current HTML vs. the build id stored in `localStorage`. On mismatch it sets the new id and `location.replace(...)` with a cache-buster *before* React loads — closes the bootstrap async gap.
- **Visibility/idle revalidation** in `src/lib/version-check.ts`: when the tab becomes visible after being hidden for more than ~10 minutes, fetch `/` no-store and hard-reload on build mismatch. Exactly the inactivity scenario the user describes.
- **Post-sign-in revalidation**: in `AuthProvider`'s `SIGNED_IN` handler, call `checkOnce()` once. If the tab was stale, login itself swaps to the new bundle.
- **Bump `APP_RESET_ID`** in `src/lib/app-reset.ts` for a one-time wipe on every currently stuck browser. Same pass strips deleted routes from persisted favorites.
- **Logout flow** (`AuthenticatedLayout.handleLogout`): keep current caches/SW wipe + `window.location.href = '/'`; additionally clear any stored "last route" key pointing at deleted paths.

### 4. Post-login destination — no change

Authenticated `/` already redirects to `/home`. Confirmed correct.

## Files touched

- Deleted: `src/pages/BacklogPage.tsx`, `src/hooks/usePersonalBacklog.ts`, `src/hooks/useBacklogGroups.ts`, `src/pages/PSSRApproverDashboard.tsx`, `src/pages/SoFReviewPage.tsx`.
- Edited: `src/App.tsx`, `src/utils/sidebarNavigation.ts`, `src/components/OrshSidebar.tsx`, `src/components/layouts/AuthenticatedLayout.tsx`, `src/pages/Index.tsx`, `src/pages/UserManagement.tsx` (breadcrumb), `src/components/LandingPage.tsx` (favorites map), any translation file referencing removed paths, `src/lib/app-reset.ts` (bump id + favorites cleanup), `src/lib/version-check.ts` (visibility/idle reload + `checkOnce`), `index.html` (head guard + `<meta name="app-build">`), `src/components/enhanced-auth/AuthProvider.tsx` (`checkOnce` on `SIGNED_IN`).

## Not changed

- Current "Good morning, Daniel" home page — stays.
- `/my-tasks`, `/projects`, `/operation-readiness`, `/or-maintenance`, `/competence-management`, `/pssr`, `/admin/*` agents pages — unchanged.
- User Management page UI itself — unchanged; only its route and breadcrumb move.
- Backend / DB / RLS — no migrations.

## Why this is permanent

- Each deleted page cannot render again: component file is gone (where exclusive), the route element is replaced by a redirect, and every nav/favorite/link/translation reference is scrubbed. Only redirects remain as safety nets for old bookmarks.
- The stale-copy-after-inactivity case is closed end-to-end by the `<head>` guard (runs before React), the visibility-driven version check (long-idle reactivation), post-`SIGNED_IN` revalidation ("logged back in and got the old shell"), and the one-time `APP_RESET_ID` bump (evicts every currently stuck browser).
