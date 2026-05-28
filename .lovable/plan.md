## Goal
Make logout/login and inactivity recovery always return to the live ORSH app, never an old shell or deleted page.

## Plan

### 1. Remove the route multiplexer that can fall back to the old shell
Refactor routing so `Index.tsx` is no longer the authenticated catch-all for multiple pages.

- Keep `/` as the public welcome/auth entry only.
- Route each authenticated page directly instead of sending `/home`, `/pssr`, `/projects`, `/admin/users`, and `/admin-tools` through `Index.tsx`.
- Create a dedicated authenticated home route for the approved current home experience.
- Keep `/my-tasks` as its own direct page.

This removes the path-switching fallback that currently makes stale UI restoration harder to control.

### 2. Add a browser snapshot / BFCache guard
Block the browser from reviving an old authenticated screen after inactivity, logout, or timeout.

- Add a `pageshow` guard for BFCache restores; if a page is restored from browser memory, revalidate and hard-reload instead of trusting the old DOM.
- Add an auth/session epoch key in storage. When logout, timeout, or a forced reset happens, increment it.
- On app boot, on visibility resume, and on protected-route mount, compare the tab’s boot epoch with the current stored epoch. If they differ, hard-reset and reload.
- Keep the build-id check, but extend it so stale browser snapshots are handled even when the deployed build has not changed.

### 3. Harden logout and inactivity timeout
Make every sign-out path fully invalidate the current tab before the next sign-in.

- Update manual logout and inactivity timeout logout to use the same hard-reset path.
- Clear any stored return route pointing to deleted or invalid paths.
- Force the post-logout navigation to a clean public entry after storage/cache/session invalidation completes.

### 4. Finish stale route cleanup and prevent fallback to deleted pages
Keep the previously requested cleanup, but enforce it in routing and persisted state.

- Preserve permanent redirects for deleted routes:
  - `/my-backlog` -> `/my-tasks`
  - `/manage-checklist` -> `/home`
  - `/vcrs` -> `/projects`
  - `/pssr/approver-dashboard` -> `/my-tasks`
  - `/pssr-reviews` -> `/my-tasks`
  - `/pssr/:id/sof` -> `/my-tasks`
  - `/p2o` -> `/home`
  - `/users` -> `/admin/users`
- Strip these legacy paths from favorites, stored navigation state, and any “last visited route” storage.
- Ensure `/admin/users` is the only valid user-management destination and that breadcrumb remains `Home > Admin > Users`.

### 5. Validation
Verify the fix against the exact failure you reported.

- Logout -> login in the same tab
- Timeout/logout after inactivity -> login again
- Return to app after hidden/inactive tab
- Old bookmarked stale routes
- `/users` redirect to `/admin/users`

## Technical details
- Main files likely involved:
  - `src/App.tsx`
  - `src/pages/Index.tsx`
  - `src/components/LandingPage.tsx`
  - `src/components/layouts/AuthenticatedLayout.tsx`
  - `src/components/enhanced-auth/AuthProvider.tsx`
  - `src/hooks/useSessionTimeout.ts`
  - `src/lib/version-check.ts`
  - `src/lib/app-reset.ts`
  - `index.html`
  - `src/utils/sidebarNavigation.ts`
  - `src/hooks/useFavoritePages.ts`
  - `src/pages/UserManagement.tsx`

## Expected result
After this change, a tab that was logged out, timed out, hidden for a long time, or restored from browser memory will be forced onto the current valid ORSH shell and can no longer fall back to the deleted legacy pages.