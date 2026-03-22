
## Step 2 Fix Plan (all requested issues)

### Findings from current code
- `DocumentSelectionStep.tsx` still uses `rounded-full` for filter chips, which is why Tier/Discipline filters look circular.
- Filter groups are rendered in one horizontal row (`flex items-center gap-4`) with no wrap strategy, causing right-side cutoff/cramping.
- Tier row badges are not fixed-size pills yet (currently auto-size with padding), so they can still appear rounded.
- Systems sidebar data is mapped directly from `p2a_handover_point_systems` join rows without dedupe, so duplicate join rows create duplicate system entries.
- Header currently shows `Disc.`; we need a cleaner non-cutoff label (`DISC`).

## Implementation scope
Single file update: `src/components/widgets/vcr-wizard/steps/critical-docs/DocumentSelectionStep.tsx`  
(No behavior changes to search, row height, checkbox behavior, navigation, or footer buttons.)

## Changes to implement

1. **Tier filter pills (compact rectangular)**
   - Replace current chip button class with fixed compact pill sizing:
     - `h-6` (24px), `text-[11px]`, `font-medium`, `px-2.5` (10px), `rounded-[12px]`, `border`.
   - Remove circular visuals entirely (`rounded-full` removed).
   - Tier color states:
     - Tier 1 inactive: light orange border/text; active: filled light orange.
     - Tier 2 inactive: light blue border/text; active: filled light blue.
     - RLMU inactive: light gray border/text; active: filled gray.

2. **Discipline filter pills (same compact treatment)**
   - Apply the same 24px/11px/10px/12px pill geometry to Process, Elect, Inst, Static, Rotating.
   - Keep each discipline’s existing color identity via active/inactive class pairs.
   - Remove any leftover circular/dot visual references from chip rendering.

3. **Filter row layout + overflow fix**
   - Rework filter area into clean grouped rows with explicit order:
     - Row 1: `TIER` label + tier pills.
     - Row 2: `DISCIPLINE` label + discipline pills.
   - Use compact spacing (`gap-2`, i.e. 8px between groups/chips).
   - Add a thin divider line under filter rows before table header (`border-t`/`h-px bg-border` equivalent).
   - Keep search bar unchanged above filters.

4. **Tier badge pills in table rows**
   - Replace current tier badge style with fixed rectangular chips:
     - `w-[28px] h-[18px] rounded-[4px] text-[11px] font-medium inline-flex items-center justify-center`.
   - Color mapping:
     - T1: light orange fill + orange text.
     - T2: light blue fill + blue text.
   - No circular shape classes.

5. **Systems sidebar deduplication**
   - In systems query transform, dedupe returned systems before building `systemTabs`.
   - Primary dedupe key: system ID (`id`, fallback `system_id`) to eliminate duplicate join rows.
   - Secondary guard: normalized name dedupe to prevent duplicate labels from data anomalies.
   - Result: only unique system names shown in sidebar (fixes duplicate “Gas Compressors”).

6. **DISC header cleanup**
   - Change last column header text to `DISC` (11px uppercase muted style retained) so it renders cleanly in the 80px column without awkward truncation.

## Verification checklist after implementation
- Tier filters are compact 24px pills, not circles.
- Discipline filters are compact, color-coded, and no right-side cutoff.
- Filter section is clean (2-row grouped layout) with divider before table.
- Row tier badges are small rectangular pills (28x18), not circular.
- Sidebar shows unique systems only (single “Gas Compressors” entry).
- Table row height remains exactly 40px; search, checkbox behavior, navigation, and footer CTAs unchanged.
