

## Plan: VCR Overlay — Full View with Locked Tabs (Pre-Execution Plan)

### Problem
When clicking a VCR from the P2A Plan workspace, the overlay shows a basic version (`VCRDetailOverlay` in `p2a-workspace/handover-points/`) with a simple overview tab. This is inconsistent with the richer VCR overlay used elsewhere (`VCRDetailOverlayWidget` in `widgets/`), and it doesn't communicate that the VCR execution plan still needs to be defined before deliverable tabs become actionable.

### Approach
Modify the **P2A workspace VCR overlay** to show the full sidebar navigation (as it does now) but **lock the deliverable tabs** when `execution_plan_status` is not `'APPROVED'`. The Overview tab remains accessible and shows basic info. A prominent banner communicates the locked state.

### Changes

**1. `VCRDetailOverlay.tsx` (p2a-workspace version)**
- Derive `isExecutionPlanApproved` from `handoverPoint.execution_plan_status === 'APPROVED'`.
- Add a `locked` property to each item in `buildingBlockTabs` when `!isExecutionPlanApproved`.
- Update `NavButton` to render locked tabs with a `Lock` icon, muted styling, and `pointer-events-none` / disabled click.
- When a locked tab is somehow clicked (or on the overview), show an **info banner** at the top of the content area: "Define the VCR Execution Plan to unlock deliverable tabs" with a lock icon.
- Keep the Overview, Comments, Qualifications, SoF, and PAC tabs always accessible (core navigation).

**2. `VCROverviewTab.tsx`**
- Add an optional `isLocked` prop. When true, show an amber/blue info card at the top: "This VCR's execution plan has not been defined yet. Deliverable tracking will be available once the execution plan is approved."
- The existing progress grid cards for deliverables (Systems Readiness, Training, etc.) will show as visually muted/greyed when locked, with `cursor-default` instead of `cursor-pointer` and no `onClick`.

### Technical Details
- The `execution_plan_status` field already exists on `P2AHandoverPoint` interface (can be `DRAFT`, `SUBMITTED`, or `APPROVED`).
- No new hooks or data fetching required — purely conditional UI rendering.
- Locked tabs use `Lock` icon (already imported) and reduced opacity styling.
- Two files modified, no new files.

