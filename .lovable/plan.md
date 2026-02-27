

## Plan: ORA Activity Plan Workflow — End-to-End Task Integration

This is a large, multi-phase feature. I recommend breaking it into **3 implementation phases** to keep each iteration testable.

---

### Phase 1: Auto-Task on Project Creation + Wizard UX Improvements

#### 1A. Auto-create "Create ORA Activity Plan" task for Snr ORA Engr

When a project is created (or team members assigned), insert a `user_tasks` row for the Snr ORA Engr:

```
user_tasks.insert({
  user_id: <snr_ora_engr_user_id>,
  title: "Create ORA Activity Plan",
  description: "Create the ORA Activity Plan for project <project_name>",
  type: "ora_plan_creation",
  status: "pending",
  priority: "High",
  metadata: { source: "ora_workflow", project_id, action: "create_ora_plan" }
})
```

**Files:**
- `src/hooks/useAutoPopulateTeam.ts` or the project creation flow — add task creation after Snr ORA Engr is assigned
- `src/components/tasks/ORPActivitiesPanel.tsx` — handle `ora_plan_creation` task type, clicking opens the wizard

#### 1B. Wizard Step Indicator — match PSSR pattern

Replace the current step indicator in `ORAActivityPlanWizard.tsx` with the same `Number + Label Below` pattern used in `CreatePSSRWizard.tsx` (circle numbers, completed = check icon, clickable to navigate back).

#### 1C. Wizard Steps 1 & 2 — Better icons

- Step 1 (Phase): Replace generic icons with more meaningful ORP-phase icons (e.g., `Compass` for Identify, `ClipboardCheck` for Assess, `Filter` for Select, `FileText` for Define, `Play` for Execute)
- Step 2 (Project Type): Replace `Building2`/`Wrench`/`Cable` with `Factory`, `Settings`, `Zap` or similar

#### 1D. Step 3 — Tree with collapsible sub-activities

Update `StepActivities.tsx`:
- Group activities by parent, render as indented tree with chevron expand/collapse
- Show activity ID badges with same styling as `ORAActivityCatalog.tsx`
- When project type is selected in Step 2, auto-set `durationDays` from the corresponding estimate (Type A → high, B → med, C → low)

**Files:**
- `src/components/ora/wizard/ORAActivityPlanWizard.tsx` — step indicator redesign
- `src/components/ora/wizard/StepPhaseSelection.tsx` — icon updates
- `src/components/ora/wizard/StepProjectType.tsx` — icon updates  
- `src/components/ora/wizard/StepActivities.tsx` — tree rendering with sub-activities

---

### Phase 2: Gantt Chart Step 4 + Submit for Approval Workflow

#### 2A. Redesign Step 4 as interactive Gantt chart

Replace the current form-list schedule step with a wide-format Gantt chart:
- Left panel: activity list with names, codes, duration input
- Right panel: horizontal timeline bars
- Start date picker per activity; end date auto-calculates from `start_date + duration`
- Drag bars to adjust dates
- Dependencies shown as connector lines
- Use existing `ORPGanttChart` component patterns or build a simplified inline version

**Files:**
- `src/components/ora/wizard/StepSchedule.tsx` — complete redesign as Gantt
- `src/components/ora/wizard/ORAActivityPlanWizard.tsx` — widen dialog for Step 4

#### 2B. Step 5: Submit for Approval

Replace "Create Plan" with "Submit for Approval":
- Set `orp_plans.status` to `PENDING_APPROVAL`
- Create `user_tasks` for ORA Lead:
  ```
  { user_id: ora_lead_id, title: "Review ORA Activity Plan", 
    type: "review", metadata: { action: "review_ora_plan", plan_id } }
  ```
- Mark the Snr ORA Engr's creation task as completed

#### 2C. ORA Lead Review & Approval

- ORA Lead sees task in My Tasks → clicks to open read-only plan view with Gantt chart
- Approve button sets `orp_plans.status = 'APPROVED'`
- On approval: create individual `user_tasks` for each activity in the plan, assigned to Snr ORA Engr, ordered by start date

**Files:**
- `src/components/ora/wizard/StepReview.tsx` — add submit for approval flow
- `src/components/ora/wizard/ORAActivityPlanWizard.tsx` — handle submission logic
- New: `src/components/ora/ORAActivityPlanReviewOverlay.tsx` — ORA Lead review view
- `src/components/tasks/ORPActivitiesPanel.tsx` — handle review task type

---

### Phase 3: ORA Activity Plan Widget + Task Completion UX

#### 3A. ORPActivityPlanWidget updates

Update the widget to show plan status and activities:
- **No plan**: Show "Create ORA Activity Plan" CTA (current behavior)
- **Draft**: Show "ORA Activity Plan" CTA with `Draft` badge
- **Under Review**: Show CTA with `Under Review` badge  
- **Approved**: Show CTA with `Approved` badge + list of upcoming/due/overdue/recently completed activities (max 5)

Clicking CTA opens the Gantt chart overlay.

**Files:**
- `src/components/widgets/ORPActivityPlanWidget.tsx` — conditional rendering by status

#### 3B. Activity Task Completion UX

When Snr ORA Engr clicks an activity task:
- Open a `TaskDetailSheet` with:
  - Activity name, code, phase, planned dates
  - **Status toggle**: Not Started → In Progress → Complete
  - **Comments section**: text input with timestamp
  - **Evidence upload**: file attachments (reuse existing upload patterns)
  - **Completion checklist** (optional): key deliverables to tick off
  - Mark Complete button that updates status and the plan progress

**Files:**
- New: `src/components/tasks/ORAActivityTaskSheet.tsx` — activity completion sheet
- `src/components/tasks/ORPActivitiesPanel.tsx` — integrate new task types

#### 3C. First activity = Create P2A Handover Plan

Ensure that when activities are loaded from the catalog, the "Create P2A Handover Plan" activity (if present) is treated as the first/highest-priority activity. Its task completion should link to the existing P2A Handover Plan creation flow.

---

### Database Changes

- **New `orp_status` enum value**: Add `PENDING_APPROVAL` to `orp_status` enum (migration)
- No new tables needed — `user_tasks` with metadata handles all task routing

### Summary of files to create/modify

| File | Action |
|------|--------|
| `ORAActivityPlanWizard.tsx` | Step indicator, widen for Gantt, submission logic |
| `StepPhaseSelection.tsx` | Better icons |
| `StepProjectType.tsx` | Better icons |
| `StepActivities.tsx` | Tree rendering, duration auto-fill |
| `StepSchedule.tsx` | Gantt chart redesign |
| `StepReview.tsx` | Submit for approval |
| `ORPActivityPlanWidget.tsx` | Status-aware display |
| `ORPActivitiesPanel.tsx` | Handle new task types |
| `ORAActivityPlanReviewOverlay.tsx` | **New** — ORA Lead review |
| `ORAActivityTaskSheet.tsx` | **New** — Activity completion |
| Auto-populate / project creation hooks | Auto-task creation |
| Migration SQL | Add `PENDING_APPROVAL` to enum |

