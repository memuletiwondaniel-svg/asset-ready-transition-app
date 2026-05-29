## Goal
Stop relying on you reporting a stale page (and me bumping `APP_RESET_ID` each time). Make ORSH proactively clear caches and pull a fresh bundle on every successful login.

## What happens today
- On `SIGNED_IN`, `AuthProvider` calls `checkAppVersion()` which only hard-reloads if the deployed build id differs from the in-memory one.
- A full hard reset only fires when I bump `APP_RESET_ID` in `src/lib/app-reset.ts` and re-deploy — which is what you keep asking me to do.

## Proposed change
On every successful login, run the same hard-reset path automatically — once per login, so it never loops.

### Behavior
1. User signs in successfully (`SIGNED_IN` event in `AuthProvider`).
2. We check a per-tab flag `__orsh_post_login_refresh` in `sessionStorage`.
   - If absent → set it, then call `performHardReset()` (wipes localStorage/sessionStorage except auth tokens + rememberMe, wipes Cache Storage, service workers, IndexedDB, then hard-reloads with a cache-busting query param). Auth session survives because `sb-*` keys are preserved.
   - If present → skip (this is the post-reload boot, app continues normally).
3. On `SIGNED_OUT`, clear the flag so the next login triggers a fresh reset again.

### Why this is safe
- `performHardReset` already preserves Supabase tokens, so the user stays signed in after the reload.
- The sessionStorage flag is per-tab and survives the reload, preventing an infinite loop.
- Logging out clears the flag so the next login gets a fresh refresh.
- No more need to manually bump `APP_RESET_ID` for routine stale-page reports.

## Files to change
- `src/lib/app-reset.ts` — export a small helper `markPostLoginRefreshDone()` / constant for the flag key (or inline the key).
- `src/components/enhanced-auth/AuthProvider.tsx` — in the `SIGNED_IN` branch, run the one-shot hard reset before the existing tracking calls; in the `SIGNED_OUT` branch, clear the flag.

## Out of scope
- No changes to the version-check polling loop, idle reload, or `APP_RESET_ID` value.
- No UI changes.
