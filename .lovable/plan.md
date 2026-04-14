

# Permanent Fix — Eliminate Stale Cache on Logout/Login

## Diagnosis

The sidebar code is correct and modernized in the codebase. The `main.tsx` already has the loading screen and cache cleanup. The remaining issue: **the cache cleanup runs on page load, but stale assets can still be served from the browser's HTTP cache before the new JS even executes.**

Three reinforcements will make this permanently bulletproof:

## Changes

### 1. Clear caches on sign-out (before navigation)
**File: `src/components/layouts/AuthenticatedLayout.tsx`**

The `handleLogout` function currently just calls `signOut()` then navigates. Add cache clearing **before** navigation so when the login page loads, there's nothing stale to serve:

```ts
const handleLogout = async () => {
  try {
    await signOut();
    // Clear all browser caches before navigating
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
  navigate('/');
};
```

### 2. Add cache-busting meta tags to `index.html`
**File: `index.html`**

Add these to `<head>` to instruct browsers not to serve cached versions of the HTML document:

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

### 3. Force hard reload on sign-out instead of client-side navigate
**File: `src/components/layouts/AuthenticatedLayout.tsx`**

Replace `navigate('/')` with `window.location.href = '/'` after sign-out. This forces the browser to do a full page fetch (not a client-side route change), which combined with the cache-busting headers guarantees the fresh bundle loads:

```ts
// Instead of navigate('/') which reuses cached modules:
window.location.href = '/';
```

Also apply the same pattern in `AuthProvider.tsx` `SIGNED_OUT` handler and `SOFReviewOverlay.tsx` / `DirectorSoFView.tsx` sign-out handlers.

## Files Modified

| File | Change |
|------|--------|
| `index.html` | Add 3 cache-busting meta tags |
| `src/components/layouts/AuthenticatedLayout.tsx` | Clear caches + hard reload on logout |
| `src/components/enhanced-auth/AuthProvider.tsx` | No change needed (auth state listener only) |
| `src/components/sof/SOFReviewOverlay.tsx` | Hard reload on exit/signOut |
| `src/components/tasks/DirectorSoFView.tsx` | Hard reload on exit/signOut |

This is a 5-file, small change. The combination of pre-mount loading screen (already done), cache clearing on logout, cache-busting meta tags, and hard reload ensures zero possibility of stale content surviving a logout/login cycle.

