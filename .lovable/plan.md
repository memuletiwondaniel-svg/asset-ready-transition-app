## Goal

Stop "stale page" recurrences for good. The app has no real PWA, so "stale" is actually: (a) the old `index.html` shell sitting in browser cache, plus (b) old `localStorage`/`sessionStorage` UI state (saved widget config, AI panel flags, collapsed sections, table prefs, recent searches, favorites, translation cache, tour flag, etc.) that makes the new build render in an old shape. The current `version-check.ts` + `index.html` cleanup logic is brittle (only triggers on SW presence, can fight itself with `__orsh_sw_cleaned`), and nothing ever resets app-side state.

## Strategy

One-shot **destructive reset** keyed off a manual `APP_RESET_ID` constant. When the value in the bundle differs from what's stored locally, the app wipes **all** browser state (caches, service workers, localStorage, sessionStorage, IndexedDB) and hard-reloads. After that, normal `APP_BUILD` polling handles future deploys, but with the brittle parts removed.

## Changes

### 1. New `src/lib/app-reset.ts`
- Export `APP_RESET_ID = "2026-05-27-1"` (bump this any time we want to force a fleet-wide wipe).
- `runResetIfNeeded()`:
  - Read `localStorage.__orsh_reset_id`. If equal to current, return.
  - Preserve only the Supabase auth keys (anything starting with `sb-`) and `rememberMe` so users don't get logged out.
  - Snapshot those into temp vars, `localStorage.clear()`, `sessionStorage.clear()`, restore the preserved keys.
  - `await caches.keys()` → `caches.delete` all.
  - `await navigator.serviceWorker.getRegistrations()` → `unregister` all.
  - Best-effort wipe IndexedDB via `indexedDB.databases()` (guarded for unsupported browsers).
  - Set `localStorage.__orsh_reset_id = APP_RESET_ID`.
  - `location.replace(location.pathname + '?_r=' + Date.now())`.
- Run synchronously from `src/main.tsx` **before** `createRoot(...)` (top of file, returns early if reload triggered).

### 2. Replace `index.html` inline SW script
- Delete the current `__orsh_sw_cleaned` block (it's the source of reload loops).
- Keep only the `<meta name="app-build">` tag and the no-cache headers — those are correct.
- Reset is now handled inside the React entry, with one source of truth.

### 3. Simplify `src/lib/version-check.ts`
- Keep `fetchRemoteBuild`/`startVersionCheck` polling, but on mismatch just bump `APP_RESET_ID` via the same reset helper instead of duplicating cache/SW wiping logic.
- Remove the `RELOAD_FLAG = "__orsh_version_reloaded"` session gate (replaced by the reset-id check, which is idempotent).
- Trigger immediately on `visibilitychange` and `online`, plus a 60s timer (already there).

### 4. Stale localStorage hygiene at the source
Add a versioned read pattern (`storage-version.ts`) used by the offenders most likely to cause "old screen" perception, so individual features can be migrated/reset without bumping the global reset id:
- `dashboardWidgetConfig`, `aiPanelVisible`, `aiPanelExpanded`, `hasSeenTour` (LandingPage)
- `orsh-admin-collapsed-sections-v2` (AdminToolsPage)
- `pssr-template-columns`, `pssr-widget-settings-*`, `pssr-widget-order-*`
- `widgetSize`
- `translationCache`
- `p2a-users`
- `pssr_recent_searches`

For each: wrap the read so values written under a different `STORAGE_SCHEMA_VERSION` are ignored and overwritten. No data migration logic — the bumped version simply means "throw away on next read".

### 5. Vite/HTML cache headers
- Keep `__APP_BUILD__` injection (good).
- Add a `Clear-Site-Data` meta-equiv is not viable in pure Vite static hosting, so instead rely on the JS reset path. No changes to `vite.config.ts` beyond confirming `transformIndexHtml` still rewrites `__APP_BUILD__`.

### 6. One manual user step (one time only)
After the fix deploys, the very first load on each device will detect the new `APP_RESET_ID`, wipe everything, and reload once. Subsequent loads are normal. No user action required other than opening the app once.

## What this fixes

- "Old stale page loading" after deploys → resolved by `APP_RESET_ID` wipe + simpler version check.
- Old widget layout / collapsed sections / AI panel position re-appearing on the new build → resolved by `STORAGE_SCHEMA_VERSION` guards.
- The reload-loop risk from `__orsh_sw_cleaned` → removed.
- Future "I changed X and the user still sees old Y" → just bump `APP_RESET_ID` once and ship.

## Out of scope

- Adding a real PWA / Workbox setup.
- Server-side cache headers on the hosting layer (Lovable serves the published build).
- Persisting React Query to disk (we're not doing that today, so nothing to invalidate).

## Acceptance

- Open app once after deploy → page reloads automatically exactly once, lands on the latest UI, user is still logged in.
- Reload again → no extra reloads, no console errors from the reset path.
- Open DevTools → Application → Storage: localStorage has only `sb-*` auth keys, `rememberMe`, `__orsh_reset_id`; no `dashboardWidgetConfig` etc. left over.
- Deploy a trivial change → within ~60s an open tab auto-reloads to the new build.
