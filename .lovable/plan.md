

## P2A Workspace Mapping UX Overhaul

This plan addresses three core issues: sluggish connector realignment during scroll, visibility constraints on smaller screens, and the need for a workspace zoom feature.

---

### Problem Summary

1. **Slow connector realignment** -- The mapping overlay (SVG lines connecting systems to VCRs) lags behind scrolling because it relies on `requestAnimationFrame` with debouncing + MutationObserver overhead. The "debounced RAF" pattern means connectors only update one frame after the browser has already painted the scroll, causing visible lag.

2. **Missing systems at certain resolutions** -- Systems like "Compressor E" may be off-screen with no way to fit more content without scrolling. There is no zoom control to compact cards and show more items at once.

3. **Mapping lines shown for partially-visible groups** -- The current logic already gates on "all systems visible," but the realignment delay makes it feel broken.

---

### Solution Overview

#### 1. Real-Time Connector Updates (Performance Fix)

Replace the current debounced-RAF recalculation in `useMappingPositions.ts` and `useVCRAlignment.ts` with **synchronous scroll event listeners** that directly update positions on each scroll event tick, eliminating the one-frame lag.

**Changes:**
- **`useMappingPositions.ts`**: Remove the `requestAnimationFrame` wrapper for scroll events. Instead, call `recalculate()` directly inside the scroll handler (scroll events already fire at frame rate). Keep RAF only for resize/mutation events. Remove the 80ms `setTimeout` delay on mount -- use a single `requestAnimationFrame` instead.
- **`useVCRAlignment.ts`**: Same pattern -- direct `recalculate()` on scroll, RAF only for resize/mutations. Remove 100ms initial delay.
- **`MappingOverlay.tsx`**: Add `will-change: transform` to the SVG element to promote it to its own compositor layer, reducing repaint cost.

#### 2. Workspace Zoom Feature

Add a zoom slider (or +/- buttons) in the workspace header that scales only the **card content** (system cards, subsystem cards, VCR cards) while keeping the structural layout (panels, phase columns, headers) in position.

**Approach:** Use a React context/state for `zoomLevel` (range 0.6 to 1.2, default 1.0) that controls:
- System/Subsystem card width (currently fixed `w-[140px]`) -- scale proportionally
- Card padding and font sizes via a CSS custom property or Tailwind scale utility
- VCR card width (also `w-[140px]`) -- scale proportionally
- Phase column width (currently `w-56`) -- scale proportionally

**Implementation:**
- **`P2AHandoverWorkspace.tsx`**: Add `zoomLevel` state. Pass it down to `SystemsPanel`, `PhasesTimeline`, and the mapping hooks. Add zoom controls (ZoomIn, ZoomOut, RotateCcw icons) to the workspace toolbar area (next to the existing fullscreen/undo buttons area inside the overlay header).
- **`P2AWorkspaceOverlay.tsx`**: Add zoom +/- buttons next to the Mapping toggle button in the header bar.
- **`SystemCard.tsx`** and **`SubsystemCard.tsx`**: Replace hardcoded `w-[140px]` with a dynamic width based on zoom level. Scale font sizes using a CSS variable `--workspace-zoom`.
- **`HandoverPointCard.tsx`**: Same treatment -- dynamic width from zoom level.
- **`StaircasePhaseColumn.tsx`**: Scale column width (`w-56` = 224px) proportionally with zoom.
- **`SystemsPanel.tsx`**: Scale panel width (`w-52` = 208px) proportionally with zoom.

The zoom will be applied via a CSS custom property `--ws-zoom` set on the workspace container div, and cards will use `calc()` or inline styles to derive their dimensions.

#### 3. Ensure VCRs Always Visible

The phase columns are already in a scrollable area. To ensure all VCRs remain visible:
- When mapping mode is ON, the phase timeline area should show a **vertical ScrollArea** within each phase column (currently it's just overflow-auto on the parent). This is already partially implemented.
- The key fix is that VCR cards in mapping mode use absolute positioning based on alignment targets. When zoom is reduced, the alignment targets compress proportionally, keeping VCRs within view.

---

### Technical Details

#### Files to Modify

| File | Change |
|---|---|
| `P2AWorkspaceOverlay.tsx` | Add zoom +/- buttons to header |
| `P2AHandoverWorkspace.tsx` | Add `zoomLevel` state, pass as prop/CSS var, set `--ws-zoom` on container |
| `useMappingPositions.ts` | Remove RAF wrapper on scroll; direct recalculate. Remove 80ms timeout. |
| `useVCRAlignment.ts` | Remove RAF wrapper on scroll; direct recalculate. Remove 100ms timeout. |
| `MappingOverlay.tsx` | Add `will-change: transform` to SVG |
| `SystemCard.tsx` | Dynamic width from `--ws-zoom` CSS var |
| `SubsystemCard.tsx` | Dynamic width from `--ws-zoom` CSS var |
| `HandoverPointCard.tsx` | Dynamic width from `--ws-zoom` CSS var |
| `StaircasePhaseColumn.tsx` | Dynamic column width from `--ws-zoom` CSS var |
| `SystemsPanel.tsx` | Dynamic panel width from `--ws-zoom` CSS var |

#### Zoom Control UI

Three small icon buttons in the overlay header (next to Mapping toggle):
- **ZoomOut** (minus icon) -- decreases by 0.1, min 0.6
- **Zoom label** showing percentage (e.g., "80%")
- **ZoomIn** (plus icon) -- increases by 0.1, max 1.2
- **Reset** -- returns to 1.0

#### Card Scaling Formula

```text
cardWidth = Math.round(140 * zoomLevel)  // 84px at 0.6x, 140px at 1.0x, 168px at 1.2x
fontSize  = scaled via CSS var
panelWidth = Math.round(208 * zoomLevel) // Systems panel
columnWidth = Math.round(224 * zoomLevel) // Phase columns
```

#### Scroll Performance Pattern

```text
// BEFORE (laggy):
scroll → cancelAnimationFrame → requestAnimationFrame → recalculate

// AFTER (instant):
scroll → recalculate() directly (scroll events are frame-synced by browser)
resize/mutation → requestAnimationFrame → recalculate
```

