

# Gap 10: Mobile-Responsive Gantt & Overlay

## Risk Assessment

**Zero impact on existing functionality.** The approach is purely conditional rendering using the existing `useIsMobile()` hook. The desktop Gantt chart code is untouched — we add an alternate mobile render path that reuses the same callbacks (`openActivitySheet`, `getReconciledActivityState`, `handleBarResizeWithUndo`, etc.).

## What Changes

### 1. `ORPGanttChart.tsx` — Mobile Timeline List View
- Import `useIsMobile()` and conditionally render a **card-based timeline list** instead of the Gantt grid when `isMobile` is true
- Each activity renders as a compact card: name, date range, horizontal progress bar, status badge
- Cards are tappable (calls existing `openActivitySheet`)
- Toolbar collapses: search becomes full-width, zoom/column controls hidden (not useful on mobile), expand/collapse remains
- Parent activities show as section headers with collapsible children (reuses existing `expandedCodes` state)
- Context menu replaced with long-press or tap-to-open (existing sheet behavior)

### 2. `ORPGanttOverlay.tsx` — Responsive Dialog & Metrics
- Metrics grid changes from `grid-cols-[1fr_auto_auto_auto]` to a stacked/wrapping layout on mobile
- Dialog padding/sizing adapts: full-width on mobile with proper safe-area insets
- SPI/At Risk/Slippage pills wrap into a 3-column grid instead of inline

### 3. Touch Target Improvements
- Activity cards get `min-h-[48px]` for comfortable tapping (44px+ touch targets)
- Status badges and action buttons get larger hit areas on mobile

## Technical Approach

```text
ORPGanttChart render:
  if (isMobile) {
    return <MobileTimelineList>   ← NEW component, same file
      - uses visibleRows, openActivitySheet, getReconciledActivityState
      - search input (full-width)
      - expand/collapse button
      - scrollable card list
    </MobileTimelineList>
  }
  return <existing Gantt grid>   ← UNCHANGED
```

All business logic (status reconciliation, task mapping, P2A/VCR detection, auto-heal, undo) stays in the parent component and is passed down to both render paths.

## Files Modified

| File | Change |
|------|--------|
| `src/components/orp/ORPGanttChart.tsx` | Add mobile conditional render with timeline list view |
| `src/components/orp/ORPGanttOverlay.tsx` | Make metrics grid and dialog responsive |

No new files needed. No database changes. No hook changes.

