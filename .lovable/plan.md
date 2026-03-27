

## Analysis: Why probe-assai-dwr6 Works but ai-chat Doesn't

**Root cause**: The probe function uses a completely different authentication mechanism (`loginAssai` from `_shared/assai-auth.ts`) AND uses native `redirect: "follow"` for both `search.aweb` and `result.aweb`. The ai-chat function uses a custom `fetchCaptureCookies` with `redirect: "manual"` everywhere.

The probe's flow:
1. `loginAssai()` — shared auth module (now deleted from `_shared/`)
2. `search.aweb` GET with `redirect: "follow"` — returns full HTML with hidden form fields
3. `result.aweb` POST with `redirect: "follow"` — returns actual document data

The ai-chat flow:
1. Custom `authenticateAssai()` with manual redirects
2. Skips `search.aweb` entirely (because it returned 2368)
3. `result.aweb` POST with manual redirects — returns 2368

**The real problem**: `search.aweb` returned 2368 for ai-chat but works in the probe. The difference is authentication — the probe's `loginAssai` likely performs a different/more complete login sequence that properly initializes server-side session state.

## Plan

### Step 1: Recreate `_shared/assai-auth.ts`

Reverse-engineer from the probe imports. The function signature is known: `loginAssai(resolvedBase, username, password, resolvedDb)` returns `{ success, cookies, error }`. Build it using native `redirect: "follow"` (matching the probe pattern) rather than `fetchCaptureCookies`.

### Step 2: Rewrite `authenticateAssai()` in ai-chat to use the shared module

Replace the current manual-redirect auth with a call to `loginAssai` from `_shared/assai-auth.ts`, exactly as the probes do. The cookies come back as an array — join them into a single Cookie header string.

### Step 3: Re-add `search.aweb` GET with `redirect: "follow"`

The probe proves this works. Re-add the `search.aweb` GET call using native `redirect: "follow"` (NOT `fetchCaptureCookies`). Extract hidden form fields from the HTML. This is the step that initializes server-side search context.

### Step 4: POST to `result.aweb` using hidden fields from search.aweb

Merge the hidden fields from `search.aweb` with the search parameters (number, purchase_code, subclass_type, etc.) and POST to `result.aweb` with `redirect: "follow"` — exactly as the probe does.

### Step 5: Deploy and test

Deploy ai-chat. Add diagnostic logs:
- `loginAssai result: success={}, cookie count={}`
- `search.aweb html length: {}, hidden fields: {}`
- `result.aweb html length: {}`

### Technical Details

**File changes**:
- `supabase/functions/_shared/assai-auth.ts` — recreate with `loginAssai()` function using standard form POST login with `redirect: "follow"`
- `supabase/functions/ai-chat/index.ts` — import `loginAssai`, rewrite `authenticateAssai()` to use it, re-add `search.aweb` GET + `result.aweb` POST both with native redirect follow

**Key difference from previous attempts**: Using `redirect: "follow"` instead of `redirect: "manual"` for the search/result calls. The probe proves this combination works. The manual redirect handling in `fetchCaptureCookies` may be losing cookies or not properly following the redirect chain that `search.aweb` requires.

