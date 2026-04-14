

# Fix: Bootstrap Loading Screen to Prevent Flash of Old Content

## Problem
The `clearLegacyWebCaches()` async call in `main.tsx` creates a gap before React mounts. During this gap, the browser can briefly render stale cached content (old sidebar), especially after logout/login which triggers a full page reload.

## Solution
Inject a loading spinner into `#root` **before** the async cache cleanup runs, so users see a clean loading state instead of a flash of old bundle content. Once cleanup finishes, React mounts normally and replaces the spinner.

## Changes

### File: `src/main.tsx`
Add `root.innerHTML = '<loading spinner HTML>'` as the first line inside `bootstrap()`, before `await clearLegacyWebCaches()`. The spinner uses inline styles (centered flexbox, CSS animation) so it works independently of any bundled CSS. React's `createRoot().render()` will replace this innerHTML automatically.

This is a single-file, ~10-line change. The senior developer's Fix 1 is correct and sufficient — the async gap is the root cause, and a pre-React loading screen closes it completely.

**Note on Fix 2 (Cache-Control headers)**: This is a Lovable platform concern, not a code change. Vite already content-hashes JS bundles, so stale `index.html` serving is the only vector. After publishing, you should verify `index.html` returns `Cache-Control: no-store` in DevTools Network tab.

