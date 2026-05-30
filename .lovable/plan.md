# Stale preview — findings and fix (revised)

## TL;DR

The stale preview is **not** caused by leaked Supabase realtime connections, polling, or streaming fetches. ORSH ships a heavy "stale-bundle hardening" system (built for production) that fires the wrong way inside the Lovable editor iframe. It repeatedly wipes storage and calls `window.location.replace(...)` inside the preview iframe, which is exactly the behavior that produces the "old, unresponsive instance" symptom — and it explains why the simpler app (which has none of this machinery) is fine.

## Evidence ruling OUT the leaked-connections hypothesis

Audit of every long-lived primitive in `src/`:

- **`supabase.channel(...)`** — 5 call sites: `AdminToolsPage.tsx` (2), `useUserPresence.ts`, `useTaskDocument.ts`, `useAttachmentCollaboration.ts`. Every one has a matching `supabase.removeChannel(channel)` in the effect's cleanup. No channel is created on every render.
- **`.subscribe()` realtime hooks** — 19 hooks reviewed (notifications, ORM, ORP, OWL, presence, comments, tasks, profile, attachments, chat dialog, kanban). `rg` for `.subscribe()` files without matching `removeChannel`/`unsubscribe` returns **zero misses**.
- **Polling (`setInterval`)** — All audited (`useUserPresence` 30s, `useSessionTimeout`, `version-check` 60s, etc.) have `clearInterval` cleanup.
- **Supabase client** — Single shared singleton in `src/integrations/supabase/client.ts`. Not re-created.
- **`onAuthStateChange`** — One listener in `AuthProvider`, unsubscribed via `subscription.unsubscribe()`. Session is awaited via `getSession()` before downstream effects run (`loading` gate).
- **Service worker / `vite-plugin-pwa`** — Not registered. The boot script in `index.html` actively unregisters any SW and clears Cache Storage on every load.

Connections are not leaking. Re-login does not stack channels.

## Actual root cause: self-reload machinery firing inside the editor iframe

Three pieces conspire, all unique to ORSH:

### 1. `src/lib/version-check.ts` — runs from `main.tsx` on every boot

- Polls `fetch('/?_v=<now>')` every **60s** and compares `<meta name="app-build">` to the in-memory `__APP_BUILD__`. On mismatch → `performHardReset()` → `window.location.replace(...)`.
- `visibilitychange`: if the tab was hidden ≥ **10 min**, on resume it **unconditionally** calls `forceFreshReload()`.
- `pageshow` with `event.persisted` → forced reload.
- `online` event → another `checkOnce()`.

Inside the Lovable editor iframe this is hostile. `__APP_BUILD__` is `Date.now()` set at Vite config load, so after any dev-server restart the in-memory `CURRENT_BUILD` of the still-open iframe no longer matches the newly served `/` HTML — the next 60-second poll triggers `performHardReset()` inside the iframe. That's also why "restart the dev server" appears to fix it (you actually navigate the iframe right after) and why the symptom keeps coming back (the next poll re-arms the trap).

### 2. `AuthProvider.tsx` — mandatory hard reset on every fresh SIGNED_IN

```ts
if (event === 'SIGNED_IN' && session?.user) {
  syncTabSessionEpoch();
  if (sessionStorage.getItem(POST_LOGIN_REFRESH_KEY) !== '1') {
    sessionStorage.setItem(POST_LOGIN_REFRESH_KEY, '1');
    void performHardReset();   // wipes storage + Cache + IDB + SW, then location.replace()
    return;
  }
  ...
}
```

`SIGNED_OUT` clears `POST_LOGIN_REFRESH_KEY`, so **every re-login** re-arms the hard reset. Inside the preview, this means re-login = full nuke + `location.replace` inside the iframe = the "after I re-login it gets worse" symptom.

### 3. `performHardReset()` itself (`src/lib/app-reset.ts`)

Wipes `localStorage`, `sessionStorage`, Cache Storage, IndexedDB, and all service workers, then `window.location.replace('?_r=<ts>')`. Fine for a production deploy, hostile inside a long-lived editor iframe.

The simpler app has none of `version-check.ts`, `app-reset.ts`, or the AuthProvider reset branch — exactly why it doesn't exhibit the symptom.

## The fix (production behavior unchanged)

Add a single "skip self-reload" predicate keyed on `import.meta.env.DEV` and short-circuit the reload machinery when true.

### Pre-flight (must run before code changes)

Confirm two facts in the running app (one quick `console.log` per environment is enough):

1. In the **editor live preview**, `import.meta.env.DEV === true` and log the hostname.
2. In the **published build**, `import.meta.env.DEV === false` and log the hostname.

If (1) and (2) hold (expected), the predicate below is airtight and we drop hostname matching almost entirely. If `DEV` is unexpectedly `false` in preview, stop and reassess — do not ship.

### Detection helper (new) — `src/lib/runtime-env.ts`

```ts
export function shouldSkipSelfReload(): boolean {
  // Editor live preview runs the Vite dev server → DEV is true.
  // Published app is a production build → DEV is false. This is the reliable signal.
  if (import.meta.env.DEV) return true;

  // Belt-and-suspenders for the editor iframe ONLY. Never match the bare
  // *.lovableproject.com / *.lovable.app suffix — that is also the production
  // host for projects without a custom domain, and would silently disable
  // every stale-bundle protection in prod.
  try {
    if (window.location.hostname.startsWith('id-preview--')) return true;
    if (window.self !== window.top) return true; // embedded in the editor iframe
  } catch {
    /* cross-origin frame access can throw; ignore */
  }
  return false;
}
```

Explicitly **rejected** alternative: `host.endsWith('.lovableproject.com')`. That would match the published ORSH origin (no custom domain attached) and silently disable the stale-bundle protections in production. Do not ship that variant.

### `src/lib/version-check.ts`

- Top of `startVersionCheck()`: `if (shouldSkipSelfReload()) return;`
- Top of `checkOnce()`: same guard.
- Install the `online` / `pageshow` / `visibilitychange` listeners only behind the guard.

### `src/components/enhanced-auth/AuthProvider.tsx`

- Wrap only the `performHardReset()` block in the `SIGNED_IN` branch with `if (!shouldSkipSelfReload()) { ... }`.
- **Keep outside the guard:** `syncTabSessionEpoch()`, `track_user_login` RPC, the `write-audit-log` invocation, and `checkAppVersion()` (which is itself a no-op under the guard now).
- `SIGNED_OUT` audit logging unchanged.

### `src/lib/app-reset.ts`

- First line of `performHardReset()`: `if (shouldSkipSelfReload()) return;` — covers every direct caller (`useSessionTimeout`, `AuthenticatedLayout`, `SOFReviewOverlay`, `DirectorSoFView`, `admin/UserProfileDropdown`).
- First line of `runResetIfNeeded()`: same guard, returning `false` so boot continues normally and a stale `APP_RESET_ID` from a prior session can't trigger a reload loop in the editor.

## Verification — step 5 is the go/no-go

1. Open the editor preview, leave it for >10 min on another tab, switch back. Expect: no reload, no stale instance.
2. Sign out and sign back in inside the preview. Expect: no `location.replace`; console shows `track_user_login` + audit-log calls; app continues. Previously: full wipe + iframe reload.
3. Restart the dev server. Expect: HMR-driven refresh only; no 60-second-later forced `location.replace` from version-check.
4. DevTools → Network → WS filter: navigate + re-login. Confirm WS count does not grow (regression test for the connection audit).
5. **GATING — published URL.** Version-check must still poll (60s), `visibilitychange` must still force-reload after 10-min idle, and `SIGNED_IN` must still run `performHardReset()`. If any of these no longer fire in production, the predicate is too broad — do not ship.

## Out of scope / explicit non-changes

- No changes to any `supabase.channel(...)`, hook cleanup, polling, or streaming code — audited and correct.
- No changes to `index.html`'s pre-React build-guard script (self-skips in dev via the `__APP_BUILD__` literal check; harmless in prod).
- No changes to `vite.config.ts` — stock Lovable config plus the `app-build` HTML transform; nothing custom is breaking the preview.
