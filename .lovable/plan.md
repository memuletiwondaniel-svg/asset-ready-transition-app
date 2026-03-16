

## P2A → VCR Plan Rename & Task/Gantt Restructure

### What's Changing

**1. Rename "VCR Execution Plan" → "VCR Plan" across the codebase (~12 files)**

Global find-and-replace of user-facing strings:
- "VCR Execution Plan" → "VCR Plan"
- "VCR Delivery Plan" → "Develop VCR Plan" (in task titles/labels)
- "Setup VCR Delivery Plan" → "Develop VCR Plan" (CTA button)
- Files: `ExecutionPlanGate.tsx`, `VCRExecutionPlanWizard.tsx`, `VCRDetailOverlay.tsx`, `VCROverviewTab.tsx`, `VCRProceduresTab.tsx`, `TaskDetailSheet.tsx`, `useUnifiedTasks.ts`, `useVCRDeliverables.ts`, `PlatformGuideDocument.tsx`, `useORAActivityPlanSync.ts`

**2. Restructure Gantt activities — flat "Develop VCR-XX Plan" (no parent/child hierarchy)**

Currently `generateVCRActivitiesFromP2A` creates a **2-level hierarchy**: VCR parent (e.g. `VCR-DP300-001`) → sub-activity `VCR-DP300-001.01` ("VCR Delivery Plan"). The request is to make these **flat** with simplified activity codes.

Changes to `src/hooks/useORAActivityPlanSync.ts` → `generateVCRActivitiesFromP2A`:
- Remove the parent activity insert (no more `source_type: 'p2a_vcr'` parent rows)
- Create a single flat activity per VCR:
  - `activity_code`: `VCR-01`, `VCR-02`, etc. (sequential, not using the full VCR code)
  - `name`: `Develop VCR-01 Plan` (matches task title pattern)
  - `source_type`: `'vcr_delivery_plan'` (unchanged — used for cleanup logic)
  - No `parent_id`
- Update task title to `Develop VCR-01 Plan – Power & Utilities` (VCR name included)
- Task description updated to match new naming

**3. Gantt click → overlay routing for VCR activities (same as P2A pattern)**

In `src/components/orp/ORPGanttChart.tsx` → `openActivitySheet`:
- Add detection for VCR activities: `actCode.startsWith('VCR-')` or `source_type === 'vcr_delivery_plan'`
- Build `selectedOraActivity` with `action: 'create_vcr_delivery_plan'` metadata so `ORAActivityTaskSheet` renders the VCR CTA section
- This ensures clicking a VCR row in the Gantt opens the same overlay as clicking the task card

**4. ORAActivityTaskSheet — add VCR Plan CTA section (mirrors P2A pattern)**

In `src/components/tasks/ORAActivityTaskSheet.tsx`:
- Add `isVCRActivity` detection: `metadata?.action === 'create_vcr_delivery_plan'` or `activityCode.startsWith('VCR-')`
- Add VCR plan status lookup (query `p2a_handover_points` by `vcr_id` from metadata)
- Render a CTA section similar to P2A:
  - Status badge (Draft / Submitted / Approved)
  - Intent message ("Configure the VCR Plan..." / "Continue..." / "View...")
  - CTA button: "Develop VCR Plan" → opens `VCRExecutionPlanWizard`
- Add `onOpenVCRWizard` callback prop (similar to `onOpenP2AWizard`)
- Wire up in all parents that render `ORAActivityTaskSheet`: `ORPGanttChart.tsx`, `TaskKanbanBoard.tsx`, `UnifiedTaskList.tsx`, `TaskTableView.tsx`, `TaskDetailSheet.tsx`

**5. Update cleanup logic references**

The revert cascade in `useKanbanDragDrop.ts` and `ORPGanttChart.tsx` already targets `source_type IN ['p2a_vcr', 'vcr_delivery_plan']`. Since we're removing the `p2a_vcr` parent:
- Keep `p2a_vcr` in the delete filter for backward compatibility (existing data)
- Flat activities use `vcr_delivery_plan` source_type only going forward

### Files to Edit

| File | Change |
|------|--------|
| `src/hooks/useORAActivityPlanSync.ts` | Flatten VCR activities (remove parent), use `VCR-01` codes, rename titles |
| `src/components/tasks/ORAActivityTaskSheet.tsx` | Add `isVCRActivity` detection, VCR CTA section, `onOpenVCRWizard` prop |
| `src/components/orp/ORPGanttChart.tsx` | Route VCR activity clicks to overlay with VCR metadata; wire `onOpenVCRWizard` |
| `src/components/tasks/TaskKanbanBoard.tsx` | Wire `onOpenVCRWizard` on `ORAActivityTaskSheet` |
| `src/components/tasks/UnifiedTaskList.tsx` | Wire `onOpenVCRWizard` |
| `src/components/tasks/TaskTableView.tsx` | Wire `onOpenVCRWizard` |
| `src/components/tasks/TaskDetailSheet.tsx` | Wire `onOpenVCRWizard`; rename "VCR Delivery Plan" labels |
| `src/components/tasks/useUnifiedTasks.ts` | Update category label |
| `src/components/p2a-workspace/handover-points/ExecutionPlanGate.tsx` | Rename strings |
| `src/components/widgets/vcr-wizard/VCRExecutionPlanWizard.tsx` | Rename dialog title |
| `src/components/widgets/VCRDetailOverlay.tsx` | Rename section header |
| `src/components/p2a-workspace/handover-points/VCROverviewTab.tsx` | Rename banner text |
| `src/components/p2a-workspace/handover-points/VCRProceduresTab.tsx` | Rename empty state text |
| `src/components/p2a-workspace/hooks/useVCRDeliverables.ts` | Rename comments |
| `src/components/admin-tools/PlatformGuideDocument.tsx` | Rename guide text |

