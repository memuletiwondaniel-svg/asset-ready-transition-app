
# Horizontal Mapping Lines: Align VCR Cards to System Positions

## Problem
When "Show Mapping" is active, the connection lines between system cards (left panel) and VCR cards (phase columns) are diagonal/angular. The user wants perfectly horizontal lines, achieved by vertically repositioning each VCR card within its phase column to match the Y position of its corresponding system group.

## How It Will Work
- When mapping mode is ON, each VCR card slides down in its phase column until its vertical center aligns with the center of its system group in the left panel
- All connection lines become perfectly straight and horizontal
- When mapping mode is OFF, VCR cards return to their normal stacked layout

## Technical Approach

### 1. New Hook: `useVCRAlignment`
Create a new hook (`src/components/p2a-workspace/mapping/useVCRAlignment.ts`) that:
- Reads system card positions from the DOM (via `data-system-id` attributes) -- these are stable because they're in the systems panel's flow layout
- Groups system positions by their assigned VCR ID
- Computes the center Y of each system group (relative to the workspace container)
- Returns a map: `Record<string, number>` (vcrId to target Y)
- Recalculates on resize, scroll, and panel changes, but is NOT triggered by VCR position changes (avoiding circular dependency)

### 2. Modify `StaircasePhaseColumn` (VCR Rendering When Mapping Active)
When `showMapping` is true and alignment targets are available:
- Switch the VCR container from flex layout to `position: relative` with a computed `minHeight`
- Each VCR card is rendered with `position: absolute` and its `top` value computed as:
  `targetY - containerTopY - cardHeight / 2`
- A ref on the VCR container div measures its position within the workspace
- The container's `minHeight` is set to accommodate the lowest-positioned VCR card

### 3. Prop Plumbing
Pass alignment targets through the component tree:
- `P2AHandoverWorkspace` calls `useVCRAlignment` and passes targets down
- `PhasesTimeline` receives and forwards `vcrAlignmentTargets` prop
- `StaircasePhaseColumn` receives targets and uses them for positioning

### 4. MappingOverlay (No Changes Needed)
The overlay already reads VCR card positions from the DOM via `data-vcr-id` attributes. Once VCR cards are repositioned to align with systems, it will naturally draw horizontal lines.

## Files to Create
- `src/components/p2a-workspace/mapping/useVCRAlignment.ts` -- new hook computing system-based Y targets for each VCR

## Files to Modify
- `src/components/p2a-workspace/P2AHandoverWorkspace.tsx` -- call `useVCRAlignment`, pass targets down
- `src/components/p2a-workspace/phases/PhasesTimeline.tsx` -- accept and forward `vcrAlignmentTargets` prop
- `src/components/p2a-workspace/phases/StaircasePhaseColumn.tsx` -- use alignment targets for absolute positioning when mapping is active

## Edge Cases Handled
- VCRs with no assigned systems: remain in natural position (no alignment target)
- Multiple VCRs in same phase: each independently positioned to match its own system group
- Scrolling in systems panel: alignment recalculates to stay in sync
- Mapping mode toggle: smooth transition between natural stacking and aligned positioning
