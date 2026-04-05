
# Assai Integration Interface Improvements

## Issues Identified

1. **"Sync Now" and "Sync Projects" CTAs are redundant** — With the DWR-based Agent (Selma) architecture, syncing happens via `selma-daily-sync` (cron) and on-demand through Selma's chat. The current "Sync Now" just re-calls `agent-assai-connect` (which only tests login), and "Sync Projects" calls `sync-assai-projects`. These should be consolidated into a single "Sync Projects" action since document sync is autonomous.

2. **No confirmation dialog when switching from Agent → API** — Users can silently switch to an unconfigured method with no warning about impact.

3. **Save button is hidden in the footer clutter** — The Save button exists (line 1268-1276) but is buried among 4 other buttons. It's only enabled when `isDirty` is true, which is correct, but hard to notice.

## Plan

### 1. Replace "Sync Now" with "Sync Projects" only
- Remove the "Sync Now" button entirely (it just re-tests the connection, duplicating "Test Connection")
- Keep "Sync Projects" as the only sync action — this is the meaningful operation (populates `dms_projects`)
- Rename it to just "Sync" with a tooltip explaining it syncs project metadata from Assai

### 2. Add confirmation dialog when switching to API
- When user clicks "API" while currently on "Agent", show an `AlertDialog` with:
  - Title: "Switch to API Mode?"
  - Body: "The REST API integration is not yet configured and requires server-side setup by your administrator. Selma (Agent mode) is currently the active and fully functional connection method. Switching to API will disable Selma's direct access until API configuration is complete."
  - Actions: "Switch Anyway" (destructive) / "Keep Agent" (cancel)
- Only show this dialog when switching TO api, not the other direction

### 3. Redesign the footer for clarity
- Reorganize the sticky footer into two rows:
  - **Top row**: "Remove credentials" (left) — "Save" button (right, prominent primary style, only shown when `isDirty`)
  - **Bottom row**: "Test Connection" and "Sync Projects" as secondary outline buttons
- Make the Save button more prominent with a visual dirty indicator (e.g., dot badge)

### 4. Add `AlertDialog` import and state
- Add `showMethodSwitchDialog` state boolean
- Import `AlertDialog` components from shadcn/ui
- Wire the API button click to show the dialog instead of directly switching

### Files to modify
- `src/components/admin-tools/IntegrationHub.tsx` — all changes in this single file
