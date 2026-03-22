

# Plan: Fix Plant Resolution + UI Improvements for Step 1

## Root Cause Analysis

**Bug**: Plant "CS" from the `plant` table is used as a substring filter against `dms_plants.plant_name`. C033 "Hammar Mishrif New Compression Station" does NOT contain the literal substring "cs", so it gets filtered out. The algorithm then incorrectly picks C008 "South Rumaila CS Quarainat Mishrif" because "mishrif" matches a project name word.

## Changes

### 1. Fix plant resolution in `CriticalDocsWizard.tsx`

Rewrite `resolveDmsPlant` to use a two-phase approach:
- **Phase 1**: Keep exact code match (unchanged)
- **Phase 2**: Score ALL active dms_plants against the DMS project name (not just those matching the plant.name substring). Use the full project name words (3+ chars) to score each dms_plant. This ensures C033 "Hammar Mishrif New Compression Station" scores 5/5 for project "New Compression Station at Hammar Mishrif"
- **Phase 3**: If the best score is >= 2 words matched, use it. Otherwise fall back to the old substring filter + scoring as a secondary attempt
- **Phase 4**: If still no match, return null (never default to first)

Remove `projectAutoDetected` / `plantAutoDetected` state and props entirely since badges are being removed.

### 2. Remove Auto-detected badges in `ProjectContextStep.tsx`

- Remove the `projectAutoDetected` and `plantAutoDetected` props
- Remove the two `Badge` elements with "Auto-detected" text
- Remove the `Badge` and `Sparkles` imports

### 3. Convert dropdowns to searchable comboboxes in `ProjectContextStep.tsx`

Replace both `Select` components with `EnhancedSearchableCombobox`:
- **Project Code**: options show `{code} {project_name}`, value is the code
- **Plant Code**: options show `{code} — {plant_name}`, value is the code

### 4. Show full names below selected values in `ProjectContextStep.tsx`

After each combobox, show a small muted text line:
- Project: find the selected project in the loaded list, display its `project_name` in 12px muted text
- Plant: find the selected plant in the loaded list, display its `plant_name` in 12px muted text

### 5. DMS card redesign in `ProjectContextStep.tsx`

- `min-h-[64px]`, icon `w-9 h-9` (36px), name `text-[13px] font-medium`
- Remove `Checkbox` import and element
- Selected: `border-2 border-primary bg-primary/5`, show `Check` icon (16px) in top-right
- Unselected: `border border-border/50`, hover `border-muted-foreground/40 bg-muted/30`, 150ms transition
- Unselected: check icon hidden

### Files Modified

1. **`CriticalDocsWizard.tsx`** — Fix `resolveDmsPlant`, remove auto-detected state/props
2. **`ProjectContextStep.tsx`** — Remove badges, searchable comboboxes, full names, card redesign

