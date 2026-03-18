

## Add Progress Tracking to VCR Plan Wizard

### Problem
The VCR Plan wizard promotes the task status to `in_progress` when opened, but never updates the `progress_percentage` on either the `user_tasks` row or the `ora_plan_activities` row. The Kanban card always shows 0%.

### Approach
Adopt the same tiered progress model used by the P2A Plan wizard (`syncWizardProgress`):

- **0%** — Not started
- **Step-based (1-83%)** — `Math.round((currentStep / totalSteps) * 83)` as the user navigates through the 8 wizard steps
- **83%** — Draft complete (all steps visited / Save & Exit from last step)
- **95%** — Submitted for approval (future, when VCR approval workflow exists)
- **100%** — Approved by all approvers

### Changes

**1. `src/components/widgets/vcr-wizard/VCRExecutionPlanWizard.tsx`**

Add a `syncVCRProgress` callback (mirroring the P2A pattern) that:
1. Finds the `ora_plan_activities` row where `source_type = 'vcr_delivery_plan'` and `source_ref_id = vcr.id`
2. Updates `completion_percentage` and `status` on that activity row
3. Finds the `user_tasks` row with `type = 'vcr_delivery_plan'` and `metadata->>vcr_id = vcr.id`
4. Updates `progress_percentage` and `metadata.completion_percentage` on that task
5. Invalidates relevant query caches

Call `syncVCRProgress` on:
- **Step navigation** (`goToStep`) — progress = `Math.round((step / 8) * 83)`, capped at 83
- **Save & Exit** — sync current step progress before closing
- **Done button** (last step) — sync at 83% (draft complete)

The 83% cap ensures the progress never exceeds "draft" until an approval workflow promotes it to 95%/100%.

