
## Fix: VCR Cards Always Visible in Phase Columns

### Problem
When mapping mode is active, VCR cards whose systems are scrolled out of view in the Systems Panel get awkwardly positioned using a fallback absolute stacking from the top of the container. This can push some VCRs (like Compressor D and E) out of the visible area of their phase column. The user wants all VCRs to always remain visible.

### Solution
Change the rendering logic in `StaircasePhaseColumn.tsx` to use a **two-group layout**:

1. **VCRs WITH alignment targets** (all systems visible): Rendered with absolute positioning to align horizontally with their system group -- same as today, with mapping lines shown.
2. **VCRs WITHOUT alignment targets** (systems scrolled out): Rendered in normal document flow at the bottom of the phase column, naturally stacking and always visible. No mapping lines shown (already handled by useMappingPositions).

This ensures every VCR card is always visible in its phase column regardless of the systems panel scroll position.

---

### Technical Changes

**File: `src/components/p2a-workspace/phases/StaircasePhaseColumn.tsx`**

Replace the single loop that renders all VCR cards with two sections:

```text
VCR Container (relative)
  |
  +-- Absolute-positioned VCRs (have alignment targets, mapping lines shown)
  |     positioned at targetY to align with systems
  |
  +-- Flow-positioned VCRs (no alignment targets, no mapping lines)
        rendered at bottom in normal flex flow, always visible
```

Specific changes:
- Split `sortedPoints` into two arrays: `alignedPoints` (have entry in `vcrAlignmentTargets`) and `unalignedPoints` (no entry).
- Render `alignedPoints` with `position: absolute` as before.
- Render `unalignedPoints` in a normal flex container at the bottom of the phase column (no absolute positioning).
- Adjust `computedMinHeight` to only account for aligned VCRs, plus space for unaligned ones in flow.
- Unaligned VCR cards get a subtle reduced opacity (e.g., 0.7) to visually indicate their mapping is not active.

No other files need changes -- `useMappingPositions` and `useVCRAlignment` already correctly skip VCRs whose systems aren't all visible.
