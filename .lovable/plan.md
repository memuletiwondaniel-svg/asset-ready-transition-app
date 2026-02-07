
# Smart Multi-Project GoHub Import

## Problem
Currently, the GoHub import is hardcoded to select only the **ZUBAIR (ZB)** project before navigating to the Completions Grid. This means if a user has a project with code like **DP-228** that exists under a different GoHub project (e.g., North Rumaila), the import will fail because it only looks in Zubair.

## Solution
Make the import **search across ALL GoHub projects** automatically. Instead of selecting just one project tile, ORSH will:

1. Extract the project code from the current ORSH project (e.g., "DP300" from "DP-300", "DP228" from "DP-228")
2. Log in to GoHub
3. Loop through **all available project tiles** (BGC BNGL, BGC SANDPIT, North Rumaila, South Rumaila, Umm Qasr, West Qurna, Zubair)
4. For each GoHub project, navigate to its Completions Grid, fetch all systems, and filter for ones matching the ORSH project code
5. Aggregate results from all projects and return them

This way, the user never needs to know which GoHub project their systems live under -- ORSH figures it out automatically.

## Data Flow

```text
User clicks "Import from GoHub"
        |
        v
Frontend sends projectCode (e.g. "DP300") 
derived from the current ORSH project
        |
        v
Edge Function: Login to GoHub
        |
        v
Extract all project tiles from Home page
(BGC BNGL, North Rumaila, South Rumaila, 
 Umm Qasr, West Qurna, Zubair, etc.)
        |
        v
For EACH project tile:
  1. Click/postback to select that project
  2. Navigate to Completions Grid
  3. Call ASMX GetSystems
  4. Filter systems containing projectCode
  5. Collect matching systems
        |
        v
Return all matched systems to frontend
```

## Changes Required

### 1. Frontend: Pass projectCode to the Edge Function

**Files:** `CMSImportModal.tsx`, `SystemsImportStep.tsx`, `P2APlanCreationWizard.tsx`

- Add a `projectCode` prop to `CMSImportModal` (passed down from the wizard which already has it)
- Pass `projectCode` through `SystemsImportStep` to `CMSImportModal`
- Include `projectCode` (stripped of dashes, e.g., "DP-300" becomes "DP300") in the request body sent to the `gohub-import` edge function
- Update the status messages to show which GoHub project is currently being searched (if feasible via streaming -- otherwise show a generic "Searching all projects..." message)

### 2. Edge Function: Search All Projects

**File:** `supabase/functions/gohub-import/index.ts`

Major refactor of the main handler flow:

- **New function: `extractAllProjectTiles(homePageHtml)`** -- Parses the home page HTML to find ALL project tiles and their postback parameters. Returns an array of `{ name: string, postbackTarget: string, postbackArgument: string }` instead of looking for just "ZUBAIR".

- **Refactor `selectProject()`** -- Change it to accept a specific project tile's postback info (target + argument) rather than searching for "ZUBAIR" by name. This makes it reusable for any project.

- **New loop in main handler:**
  ```
  for each projectTile in allTiles:
    1. Select the project (postback)
    2. Navigate to Completions Grid  
    3. Call ASMX GetSystems
    4. Filter for systems matching projectCode
    5. Append matches to results
    6. Navigate back to home page (re-login or re-fetch home)
  ```

- **Session handling:** After selecting each project, the session context changes. To select the next project, the function will need to navigate back to the home page. This may require re-fetching the home page (with existing cookies) to get fresh hidden fields and postback targets.

- **Early exit optimization:** If systems are found in a project, still continue checking remaining projects (a project code could theoretically appear across multiple GoHub projects). But we can add a flag to stop early if the user prefers speed.

- **Remove hardcoded "ZUBAIR" and "ZB" references** from `selectProject()` and the main handler.

- **Update the `projectFilter` default** from `"DP300"` to being required from the frontend (no fallback).

### 3. Technical Details

**Extracting project tiles:**
The home page shows tiles like "BGC BNGL (NR)", "ZUBAIR (ZB)" etc., each with a `__doPostBack` link. The new `extractAllProjectTiles` function will use a regex pattern similar to:
```
/<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]{0,500}?<\/a>/gi
```
Combined with nearby text to identify the project name, then extract the postback target/argument for each.

**Navigating back to home page between projects:**
After processing one project's completions grid, the function will fetch the portal URL again using the existing session cookies. Since the user is already authenticated, this should return the home page with the project tiles, allowing selection of the next project.

**Error resilience:**
If one project fails (e.g., user doesn't have access), the function will log the error and continue to the next project rather than failing the entire import.

**Performance consideration:**
Searching 7 projects sequentially will take longer than searching just 1. The status message will be updated to inform the user that "Searching across all GoHub projects..." so they know to expect a slightly longer wait. Each project typically takes 2-3 seconds, so total time should be under 20 seconds.
