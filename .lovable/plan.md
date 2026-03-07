

## Investigation Results

### Pending Approver
The ORA Plan for **DP-300 - HM Additional Compressors** has two approvers:
- **Roaa Abdullah** (ORA Lead) — **APPROVED**
- **Victor Liew** (Project Hub Lead) — **PENDING**

Victor Liew **does have a task** assigned: `"Review ORA Plan – DP-300 - HM Additional Compressors"` (type: `ora_plan_review`, status: `pending`).

### UI/UX Assessment: Metric Card Icon Layout
Placing the icon **inline with the number on the same row** (horizontal layout) is the modern best practice for compact KPI cards. It reduces vertical height, improves scannability, and follows dashboard patterns used by Linear, Notion, and Vercel. The current stacked layout wastes vertical space. Icon and number sizes should be kept small for these compact indicator cards — increasing them would make them compete visually with the primary "Overall Progress" card.

---

## Plan

### 1. Read-only mode for non-approved plans
- Add a `readOnly` prop to `ORPGanttChart` (default `false`)
- Pass `readOnly={planStatus !== 'APPROVED' && planStatus !== 'IN_PROGRESS'}` from `ORPGanttOverlay`
- When `readOnly` is true:
  - Disable bar dragging (skip `handleMouseDown` calls)
  - Disable row click → activity sheet opening (or open in view-only mode)
  - Hide "Add ORA Item" button
  - Show a subtle banner: "This plan is under review — view only"
- In `ORAActivityTaskSheet`, pass `readOnly` to disable Save/Delete/status changes

### 2. Add project ID and name under "ORA Plan" title
- Pass `projectTitle` and `projectCode` (e.g. "DP-300") to `ORPGanttOverlay` from `ORPActivityPlanWidget`
- Render under "ORA Plan" as a muted subtitle: `DP-300 · HM Additional Compressors`
- Fetch project info in the widget (it already has `projectId`) or query it in the overlay

### 3. Metric cards: icon + number inline, narrower width
- Restructure the 3 metric cards to use a **horizontal row layout**: icon on left, value on right, label below
- Reduce card `min-w` from `56px` to `48px`
- Change grid from `grid-cols-[minmax(180px,0.6fr)_auto_auto_auto]` to `grid-cols-[1fr_auto_auto_auto]` so the Overall Progress card fills remaining space
- Keep icon at `h-3.5 w-3.5` and value at `text-sm font-bold` (slight increase from current `text-xs`)

### 4. Ensure approver edits reflect in final plan
- Already handled: the review wizard writes to `wizard_state` and `orp_approvals`. The `useORPPlanDetails` hook merges `oraRow` DB data over wizard state. After approval + materialization, all activities are written to `ora_plan_activities`. No additional changes needed — edits by approvers during review are persisted in `wizard_state` which feeds the materialization process.

### Files to modify
- `src/components/orp/ORPGanttChart.tsx` — add `readOnly` prop, gate interactions
- `src/components/orp/ORPGanttOverlay.tsx` — pass `readOnly`, add project subtitle, adjust metric card layout
- `src/components/widgets/ORPActivityPlanWidget.tsx` — pass project info to overlay
- `src/components/tasks/ORAActivityTaskSheet.tsx` — respect `readOnly` prop

