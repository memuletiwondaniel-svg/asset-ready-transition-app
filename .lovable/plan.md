
# Fix GoHub CMS Import: Web Login, Credential Persistence, and Completions Grid Scraping

## Problem Summary

There are several issues with the current GoHub CMS Import:

1. **Dialog closes immediately** when clicking "Import from GoHub" -- the CMS Import modal (a nested Radix Dialog) conflicts with the parent wizard Dialog, causing the parent to close
2. **Credentials are not remembered** -- users must re-enter Portal URL, Username, and Password every time
3. **Wrong data source** -- the edge function tries to fetch from the REST API (`/api/SubSystem`), but what you actually need is the **Completions Grid** page data showing System Name, System ID, and Progress %
4. **No DP300 filtering** -- the import needs to filter systems where the System ID contains "DP300"
5. **No progress field** -- the `WizardSystem` interface does not include a `progress` field

## Solution Overview

### 1. Fix the Nested Dialog Bug

The CMS Import modal is a Radix `Dialog` nested inside the wizard `Dialog`. When the inner dialog opens, Radix's focus management can cause the outer dialog to close.

**Fix:** Replace the CMS Import `Dialog` with a Radix `AlertDialog` (which does not dismiss on outside click) or use the `modal={false}` prop and manually prevent propagation. The cleanest approach is to use a portal-based approach with `onOpenAutoFocus` and `onInteractOutside` event prevention on the inner dialog.

### 2. Credential Persistence via localStorage

Store the GoHub credentials in localStorage under a key like `gohub-credentials`. When the CMS Import modal opens, pre-populate the fields. When the user clicks Import, save the credentials.

- Key: `gohub-credentials`
- Value: `{ portalUrl, username, password }` (JSON)
- Pre-populate on modal open
- Save on successful import

### 3. Rewrite Edge Function: Scrape Completions Grid

Based on your screenshots, the flow in the GoHub web interface is:

```text
Login --> Select Project (ZUBAIR/ZB) --> Completions Menu --> Completions Grid
```

The Completions Grid shows cards with: **System ID** (e.g., C017-DP300-100), **System Name** (e.g., GAS), and **Progress %** (e.g., 100.00%).

The edge function will be rewritten to:

1. **Login** via the ASP.NET web form at `/BGC/Login.aspx` (existing logic, mostly working)
2. **Select the Zubair project** by navigating to the project selection page and clicking the ZB project link
3. **Navigate to the Completions Grid** page at the appropriate URL (e.g., `/BGC/GoCompletions/SystemCompletion.aspx`)
4. **Scrape the HTML** to extract System ID, System Name, and Progress %
5. **Filter for DP300** -- only return systems where the System ID contains "DP300"
6. **Also try the REST API** as a fallback -- attempt `/BGC/api/SubSystem?ps=100&Name:con=DP300` with session cookies, using the `X-Pagination` header for pagination metadata (not response body)

### 4. Add `progress` Field to WizardSystem

Update the `WizardSystem` interface to include an optional `progress` number field, and display it in the systems list with a colored progress bar (matching the GoHub color scheme: green for 100%, red for 0%, etc.).

---

## Technical Details

### Files to Modify

#### `src/components/widgets/p2a-wizard/steps/CMSImportModal.tsx`
- Replace `Dialog` with a nested-safe approach (prevent `onInteractOutside` and `onPointerDownOutside` from closing the parent)
- Load credentials from `localStorage` on mount
- Save credentials to `localStorage` on import
- Remove the "Resource to Import" dropdown (no longer needed -- we always fetch the Completions Grid data)
- Add a "Remember credentials" toggle (checked by default)
- Show progress data in the success message

#### `src/components/widgets/p2a-wizard/steps/SystemsImportStep.tsx`
- Update `WizardSystem` interface to add optional `progress?: number`
- Show progress percentage next to each system in the list (color-coded bar)
- Display System ID prominently alongside the system name

#### `supabase/functions/gohub-import/index.ts`
Major rewrite to implement:
- **Web login** (keep existing ASP.NET form submission logic)
- **Project selection** -- after login, navigate to select the Zubair (ZB) project by following the appropriate link
- **Completions Grid scraping** -- fetch the SystemCompletion.aspx page and parse the HTML to extract:
  - System ID (e.g., "C017-DP300-100")
  - System Name (e.g., "GAS")
  - Progress percentage (e.g., 100.00)
- **DP300 filtering** -- filter results server-side where System ID contains "DP300"
- **API fallback** -- if scraping fails, try the REST API with `Name:con=DP300` filter and `X-Pagination` header for pagination (instead of checking response body for `Items`/`TotalPages`)
- Accept `portalUrl`, `username`, `password`, and optional `projectFilter` (default: "DP300") from request body
- Return systems with `progress` field included

#### No changes needed to `supabase/config.toml`
The `[functions.gohub-import]` entry with `verify_jwt = false` already exists.

### Data Flow

```text
User clicks "CMS Import"
  --> Modal opens (credentials pre-filled from localStorage)
  --> User clicks "Import from GoHub"
  --> Frontend calls edge function with credentials + project filter
  --> Edge function:
      1. POST login form to /BGC/Login.aspx
      2. Follow redirects, capture session cookies
      3. GET project selection page, click Zubair (ZB)
      4. GET Completions Grid page
      5. Parse HTML for system cards
      6. Filter for DP300 systems
      7. Return [{system_id, name, progress}, ...]
  --> Frontend receives systems with progress
  --> Systems populate the wizard Step 1 list
  --> Credentials saved to localStorage
```

### System List Display Enhancement

Each system card in the wizard will show:
- **System ID** (e.g., C017-DP300-100) in monospace font
- **System Name** (e.g., GAS)
- **Progress bar** with percentage, color-coded:
  - Green (100%)
  - Yellow-green (60-99%)
  - Red (0%)
- HC badge where applicable
