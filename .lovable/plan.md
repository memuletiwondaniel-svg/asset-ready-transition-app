

## Investigation Results

**DP-300 ORA Plan Status:** The plan (`2b88ecdf`) is marked **APPROVED** in the database with 13 activities stored in `wizard_state`. However:
- `orp_plan_deliverables` table has **0 rows** for this plan (activities only exist in `wizard_state` JSON)
- `ora_plan_activities` table also has **0 rows**
- Only 1 approver (ORA Lead) exists in `orp_approvals`, status = APPROVED

**Why "Approved" badge shows:** The widget reads `orp_plans.status` directly and displays the matching badge. This is correct behavior.

**Why 0/0 activities and 0% progress:** The widget (`ORPActivityPlanWidget`) queries `orp_plan_deliverables` for activity counts, but the activities for this plan were never materialized into that table — they only exist as JSON in `wizard_state`.

**Why clicking opens an empty Gantt:** The `ORPGanttOverlay` loads from `orp_plan_deliverables` which is empty.

---

## Plan

### 1. Fix the data gap: Materialize wizard_state activities into ora_plan_activities

When a plan is approved, run a post-approval hook that:
- Reads the 13 activities from `wizard_state`
- Inserts them into `ora_plan_activities` with proper hierarchy, dates, and codes
- Adds a **"Create P2A Plan"** activity automatically and assigns it to the Sr. ORA Engineer
- Generates `user_tasks` for leaf-level activities
- Write a one-time migration to backfill DP-300's activities from its current `wizard_state`

### 2. Redesign the ORA Activities widget card content

Replace the current widget to show:
- **ORA Plan CTA button** with status badge (Draft/Under Review/Approved/In Progress) — always visible
- **Overall progress bar** with X/Y activities and percentage
- **Upcoming/completed activities list** (5-10 items) sourced from `ora_plan_activities`
- **Key dates** (plan start → end range)
- Clicking the CTA opens a **two-tab dialog**: Schedule (Gantt) + Approvals

### 3. Upgrade ORPGanttOverlay to a two-tab dialog

Add Tabs component to `ORPGanttOverlay`:
- **Tab 1 — Schedule:** Load the Gantt chart from `ora_plan_activities` (not deliverables). Reuse `StepSchedule` in read-only mode.
- **Tab 2 — Approvals:** Show approver list from `orp_approvals` with user profiles, role, status badges, comments, and timestamps.

### 4. Post-approval workflow in handleReviewDecision

When all approvers approve (plan status → APPROVED):
1. **Materialize activities**: Insert `wizard_state.activities` into `ora_plan_activities`
2. **Add "Create P2A Plan" activity**: Auto-insert with assignment to the project's Sr. ORA Engineer
3. **Generate user_tasks**: Create tasks for leaf-level activities assigned to the Sr. ORA Engineer
4. **Update plan status** to `IN_PROGRESS` after task generation

### 5. Update useProjectORPPlans hook

Change the data source from `orp_plan_deliverables` to `ora_plan_activities` so the widget shows real activity counts and progress. Fall back to `wizard_state` activity count if `ora_plan_activities` is empty (pre-approval).

### Technical Details

**Files to modify:**
- `src/components/widgets/ORPActivityPlanWidget.tsx` — Redesign card layout with CTA, progress, activity list, dates
- `src/components/orp/ORPGanttOverlay.tsx` — Add Tabs (Schedule + Approvals)
- `src/components/ora/wizard/ORAActivityPlanWizard.tsx` — Add post-approval materialization logic in `handleReviewDecision`
- `src/hooks/useProjectORPPlans.ts` — Switch data source to `ora_plan_activities` + `wizard_state` fallback

**New files:**
- `src/components/orp/ORPApprovalsTab.tsx` — Approvals tab component
- Migration SQL to backfill DP-300 activities from `wizard_state` into `ora_plan_activities`

**Database flow on approval:**
```text
wizard_state.activities → INSERT INTO ora_plan_activities (with hierarchy, dates, codes)
                        → INSERT "Create P2A Plan" activity (assigned_to = Sr ORA Engr)
                        → INSERT INTO user_tasks (leaf activities → assigned users)
                        → UPDATE orp_plans SET status = 'IN_PROGRESS'
```

