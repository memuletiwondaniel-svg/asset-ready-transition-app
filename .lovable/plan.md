

## Plan: P2A Approval → ORA Activity Plan Integration with Smart Task Correlation

This is a large, multi-phase feature that connects P2A plan approval to automatic ORA activity generation, task creation, and intelligent checklist feedback. Given the scope, this plan is split into implementable phases.

### Recommendation: Task Granularity

The modern best practice is **leaf-level tasks only with automatic parent rollup**:
- Tasks are created only at the lowest actionable level (e.g., "Deliver Gas Detection Training", "RFO Certificate Sign-off for UPS")
- Parent activities auto-calculate completion percentage from children
- Sub-activities and activities auto-complete when all their children are done
- This prevents task queue overload while maintaining full traceability
- The Gantt chart provides the mid-level visibility; My Tasks provides the actionable work items

### Database Changes

#### New table: `ora_plan_activities`
Stores dynamically generated ORA plan activities (distinct from `ora_activity_catalog` which is the template). This table supports the full hierarchy: Activity → Sub-Activity → Sub-Sub-Activity → Sub-Sub-Sub-Activity.

```sql
CREATE TABLE ora_plan_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orp_plan_id UUID NOT NULL REFERENCES orp_plans(id),
  parent_id UUID REFERENCES ora_plan_activities(id),
  activity_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',  -- 'p2a_vcr', 'vcr_delivery_plan', 'vcr_building_block', 'itp', 'manual'
  source_ref_id UUID,          -- FK to p2a_handover_points, p2a_vcr_training, p2a_itp_activities, etc.
  source_ref_table TEXT,       -- 'p2a_handover_points', 'p2a_vcr_training', etc.
  status TEXT NOT NULL DEFAULT 'NOT_STARTED',  -- NOT_STARTED, IN_PROGRESS, COMPLETED
  completion_percentage INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  duration_days INTEGER,
  assigned_to UUID REFERENCES profiles(user_id),
  task_id UUID,                -- back-reference to user_tasks
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### New columns on `user_tasks.metadata`
No schema change needed — metadata JSONB already supports arbitrary keys. Will use:
- `ora_plan_activity_id` — links task to `ora_plan_activities`
- `action` — e.g., `create_vcr_delivery_plan`, `complete_building_block`
- `vcr_id`, `vcr_code`, `vcr_name` — for context

### Phase 1: P2A Approval Triggers ORA Activity Creation

**When `checkAndCompletePlan()` transitions a P2A plan to COMPLETED:**

1. Mark the "P2A Handover Plan" deliverable in `orp_plan_deliverables` as COMPLETED
2. For each VCR in `p2a_handover_points` for that plan:
   - Insert into `ora_plan_activities`: `VCR-01: Power` (name), VCR scope as description, source_type='p2a_vcr'
   - Insert child: `VCR Delivery Plan` (sub-activity)
   - Create `user_tasks` for Snr ORA Engr: "Create VCR Delivery Plan – VCR-01: Power"
   - Link task back to the sub-activity via `task_id`

**Files:**
- `src/hooks/useP2AApprovalTasks.ts` — extend `checkAndCompletePlan()` with VCR→ORA activity generation
- New: `src/hooks/useORAActivityPlanSync.ts` — shared logic for generating ORA plan activities from P2A/VCR data

### Phase 2: Task Overlay → VCR Delivery Plan Wizard

**In My Tasks, when user opens the "Create VCR Delivery Plan" task:**

1. The task detail sheet shows a "Setup VCR Delivery Plan" button
2. Clicking it opens the existing VCR delivery plan wizard (the 8-step wizard with VCR Items, Training, Procedures, etc.) pre-populated with the VCR context
3. The wizard targets the specific VCR (`handover_point_id`)

**Files:**
- `src/components/tasks/TaskDetailSheet.tsx` — add conditional CTA button for `create_vcr_delivery_plan` task type
- Wire existing VCR overlay/wizard components

### Phase 3: VCR Delivery Plan Approval → Building Block Activities

**When VCR delivery plan is approved (all VCR approvers sign off):**

1. Mark "VCR Delivery Plan" sub-activity as COMPLETED
2. Generate building block sub-activities under the VCR activity:
   - **Training** → sub-sub-activities from `p2a_vcr_training` (each training item)
   - **Procedures** → from `p2a_vcr_procedures`
   - **Critical Documents** → from `p2a_vcr_critical_docs`
   - **CMMS** → from `p2a_vcr_deliverables` where type matches
   - **2Y Spares** → from `p2a_vcr_deliverables`
   - **Operational Registers** → from `p2a_vcr_operational_registers`
   - **Logsheets** → from `p2a_vcr_logsheets`
   - **Systems** → from `p2a_handover_point_systems`:
     - Each system becomes a sub-sub-activity
     - Each ITP activity (`p2a_itp_activities`) for that system becomes a sub-sub-sub-activity
   - **Complete VCR Checklists** → single sub-activity

3. Create leaf-level `user_tasks` for the Snr ORA Engr for each terminal activity
4. Auto-rollup trigger: when a task is completed, update `ora_plan_activities.completion_percentage` up the tree

**Files:**
- `src/hooks/useORAActivityPlanSync.ts` — `generateBuildingBlockActivities()` function
- `src/hooks/useUserTasks.ts` — extend task completion handler to sync back to `ora_plan_activities`

### Phase 4: Bidirectional Task ↔ Activity Sync

**Task completion → Activity update:**
- When a `user_tasks` entry with `ora_plan_activity_id` in metadata is completed → update that `ora_plan_activities` row to COMPLETED
- Trigger parent rollup: recalculate parent's `completion_percentage` = (completed children / total children) * 100
- If parent reaches 100% → auto-mark as COMPLETED → propagate up

**Activity update → Task update:**
- If an activity is manually marked complete in the Gantt chart → complete the linked task

**Files:**
- `src/hooks/useUserTasks.ts` — add `syncORAActivityCompletion()` in the task status handler
- DB trigger or client-side logic for parent rollup

### Phase 5: VCR Checklist Intelligence

**Inline progress badge (on checklist item row):**
- For checklist items like "Have all trainings been completed?", query `ora_plan_activities` where `source_ref_table = 'p2a_vcr_training'` and aggregate completion
- Display badge: "3/5 completed" with color coding (red < 50%, amber < 100%, green = 100%)

**Smart assistant panel (on checklist item detail sheet):**
- When delivering party opens a checklist item, show a collapsible "ORSH Intelligence" panel
- Panel queries linked ORA activities by matching the building block category
- Shows: list of related activities with status, evidence links, completion dates
- Recommendation indicator: "Ready to close" / "Pending items remain"

**Files:**
- New: `src/hooks/useVCRChecklistIntelligence.ts` — queries `ora_plan_activities` for a given VCR + category
- Modify VCR checklist item detail UI to show the intelligence panel

### Phase 6: ORA Gantt Chart Integration

**Display dynamically generated activities in the existing Gantt:**
- `ORPGanttChart.tsx` and `StepSchedule.tsx` need to render `ora_plan_activities` (not just `orp_plan_deliverables`)
- Clicking a VCR activity row opens the VCR overlay
- Clicking a building block activity shows its detail sheet with linked task status

**Files:**
- `src/components/orp/ORPGanttChart.tsx` — fetch and merge `ora_plan_activities` into the Gantt view
- `src/components/ora/wizard/StepSchedule.tsx` — same integration for wizard view

### Files Modified Summary

1. **`src/hooks/useP2AApprovalTasks.ts`** — extend `checkAndCompletePlan` to trigger ORA activity generation
2. **New: `src/hooks/useORAActivityPlanSync.ts`** — core logic for VCR→activity generation and building block expansion
3. **`src/hooks/useUserTasks.ts`** — bidirectional sync with `ora_plan_activities`
4. **`src/components/tasks/TaskDetailSheet.tsx`** — CTA button for VCR delivery plan creation
5. **New: `src/hooks/useVCRChecklistIntelligence.ts`** — checklist item intelligence queries
6. **`src/components/orp/ORPGanttChart.tsx`** — render dynamic activities
7. **`src/components/ora/wizard/StepSchedule.tsx`** — render dynamic activities
8. **Database migration** — `ora_plan_activities` table + RLS policies + rollup trigger

### Implementation Order

Given complexity, recommend implementing in order: Phase 1 → Phase 2 → Phase 4 → Phase 3 → Phase 6 → Phase 5. Each phase is independently testable.

