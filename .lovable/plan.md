

## Problem

1. **3 stale ORA plans exist** for DP-300 — these were created during earlier testing/development and are now deactivated (`is_active = false`). They should be **deleted** (not just deactivated).

2. **No uniqueness enforcement** — the wizard and database allow creating multiple `orp_plans` per project. A project should have exactly **one** active ORA Activity Plan.

## Plan

### 1. Delete stale ORA plan data for DP-300
Use the Supabase insert tool (data operation) to delete:
- `orp_plan_deliverables` where `orp_plan_id` in the 3 stale plan IDs
- `orp_approvals` for those plans
- `orp_resources` for those plans
- `orp_activity_log` for those plans
- The 3 `orp_plans` rows themselves

Plan IDs: `38da68ad-...`, `b2c3d4e5-...`, `745d4b06-...`

### 2. Add unique constraint via migration
Create a **unique partial index** on `orp_plans(project_id)` where `is_active = true`, ensuring only one active plan per project.

```sql
CREATE UNIQUE INDEX orp_plans_one_active_per_project
ON orp_plans (project_id)
WHERE is_active = true;
```

### 3. Add guard in wizard creation logic
In `ORAActivityPlanWizard.tsx`, before inserting a new plan, query for an existing active plan for the project. If one exists, show a toast error and abort.

### 4. Add guard in widget
In `ORPActivityPlanWidget.tsx`, hide the "Create" button if an active plan already exists (this is already partially done via `primaryPlan` check, but ensure it's robust).

