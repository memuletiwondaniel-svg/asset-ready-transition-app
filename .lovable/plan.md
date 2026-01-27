

# Phase Deletion Warning & Unassigned VCRs Layout Redesign

## Overview
This plan implements two connected features:
1. **Phase Deletion Warning**: When a user attempts to delete a phase, show a confirmation dialog that warns them about the implications and automatically moves all VCRs in that phase to the "Unassigned VCRs" section upon confirmation.
2. **Unassigned VCRs Section Redesign**: Reposition the "Unassigned VCRs" section from a vertical column on the left side to a horizontal bar that always appears **beneath** all phase columns at the bottom of the workspace.

## Changes Summary

### 1. Create Delete Phase Dialog Component
**New File: `src/components/p2a-workspace/phases/DeletePhaseDialog.tsx`**

Create a new confirmation dialog following the existing `DeleteVCRDialog` pattern:
- Display phase name and a warning icon
- Show the count of VCRs that will be moved to "Unassigned"
- List implications:
  - VCRs will be moved to the Unassigned section (not deleted)
  - Systems assigned to those VCRs will remain assigned
  - Phase milestones links will be removed
- Include Cancel and "Delete Phase" action buttons
- Accept props: `open`, `onOpenChange`, `phase`, `vcrCount`, `onConfirm`, `isDeleting`

### 2. Modify useP2APhases Hook
**File: `src/components/p2a-workspace/hooks/useP2APhases.ts`**

Extend the `deletePhase` mutation to:
1. Before deleting the phase, update all VCRs with that `phase_id` to set `phase_id = null` (moving them to unassigned)
2. Then delete the phase
3. Invalidate both `p2a-phases` and `p2a-handover-points` queries on success

```text
Current Flow:
  deletePhase(id) → DELETE phase → invalidate phases

New Flow:
  deletePhase(id) → UPDATE VCRs SET phase_id = null WHERE phase_id = id 
                  → DELETE phase 
                  → invalidate phases + handover-points
```

### 3. Update StaircasePhaseColumn to Show Confirmation Dialog
**File: `src/components/p2a-workspace/phases/StaircasePhaseColumn.tsx`**

- Add local state for `showDeleteDialog`
- Change the dropdown menu item to open the dialog instead of calling `onDeletePhase` directly
- Pass the VCR count (from `handoverPoints.length`) to the dialog
- Render the `DeletePhaseDialog` component

### 4. Redesign Unassigned VCRs Section Layout
**File: `src/components/p2a-workspace/phases/PhasesTimeline.tsx`**

Restructure the layout:
```text
Current Layout:
┌────────────────────────────────────────────────────┐
│ [Unassigned] [Phase 1] [Phase 2] [Phase 3] [+ Add] │
│   Column       Column    Column    Column          │
└────────────────────────────────────────────────────┘

New Layout:
┌────────────────────────────────────────────────────┐
│      [Phase 1] [Phase 2] [Phase 3] [+ Add Phase]   │  ← Horizontal row of phases
├────────────────────────────────────────────────────┤
│ ═══════════ Unassigned VCRs (Horizontal Bar) ════  │  ← Sticky bottom row
└────────────────────────────────────────────────────┘
```

- Move `UnassignedVCRColumn` outside the phases flex container
- Position it as a horizontal bar at the bottom of the workspace
- Use `flex-col` for the main container to stack phases above unassigned row
- The unassigned section should use `flex-wrap` for horizontal VCR card layout

### 5. Update UnassignedVCRColumn for Horizontal Layout
**File: `src/components/p2a-workspace/phases/UnassignedVCRColumn.tsx`**

Modify the component to work as a horizontal bottom bar:
- Change from vertical column (`w-72`) to full-width horizontal bar
- Adjust header to be inline/compact
- VCR cards arranged in horizontal row with flex-wrap
- Add a collapsible/expandable behavior (optional enhancement)
- Keep droppable functionality for drag-and-drop

---

## Technical Details

### DeletePhaseDialog Component Structure
```text
AlertDialog
├── AlertDialogContent
│   ├── AlertDialogHeader
│   │   ├── Warning Icon + Phase Name
│   │   └── AlertDialogDescription
│   │       ├── "You are about to delete this phase"
│   │       └── Warning Box (amber styled)
│   │           ├── "X VCRs will be moved to Unassigned"
│   │           ├── "Systems will remain assigned to their VCRs"
│   │           └── "Phase timeline links will be removed"
│   └── AlertDialogFooter
│       ├── Cancel button
│       └── Delete Phase button (destructive)
```

### Database Operations on Phase Delete
```text
1. UPDATE p2a_handover_points 
   SET phase_id = NULL 
   WHERE phase_id = [deleted_phase_id]

2. DELETE FROM p2a_project_phases 
   WHERE id = [deleted_phase_id]
```

### Layout CSS Structure
```text
PhasesTimeline (flex-1 flex flex-col)
├── Header (milestones bar)
├── ScrollArea (flex-1)
│   ├── Phase Columns Container (flex gap-4)
│   │   ├── Phase 1
│   │   ├── Phase 2
│   │   ├── ...
│   │   └── Add Phase Button
│   └── Unassigned VCRs Bar (w-full, border-t, mt-4)
│       ├── Compact Header ("Unassigned VCRs" + count)
│       └── VCR Cards Container (flex flex-wrap gap-2)
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/p2a-workspace/phases/DeletePhaseDialog.tsx` | Create | New confirmation dialog component |
| `src/components/p2a-workspace/hooks/useP2APhases.ts` | Modify | Update deletePhase to move VCRs first |
| `src/components/p2a-workspace/phases/StaircasePhaseColumn.tsx` | Modify | Add dialog state and render DeletePhaseDialog |
| `src/components/p2a-workspace/phases/PhasesTimeline.tsx` | Modify | Restructure layout with bottom unassigned bar |
| `src/components/p2a-workspace/phases/UnassignedVCRColumn.tsx` | Modify | Convert to horizontal bar layout |

---

## User Experience Flow

1. User clicks "Delete Phase" from phase dropdown menu
2. Confirmation dialog appears showing:
   - Phase name being deleted
   - Number of VCRs that will be moved
   - Warning about implications
3. User clicks "Cancel" → Dialog closes, nothing happens
4. User clicks "Delete Phase" → 
   - VCRs in that phase move to Unassigned section (visible at bottom)
   - Phase is deleted
   - Toast confirms "Phase deleted"
5. User can see moved VCRs in the horizontal "Unassigned VCRs" bar at the bottom
6. User can drag VCRs from Unassigned bar back into other phases

