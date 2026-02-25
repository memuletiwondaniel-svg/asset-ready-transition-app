

## Problem

Two PSSRs (PSSR-KAZ-001 assigned to Hussein Alaa, and PSSR-CS-001 assigned to Shakir Alzohairy) are stuck in "Pending Lead Review" status, but neither lead has a corresponding review task in `user_tasks`. This means they have no way to act on or even see these PSSRs in their task panel.

The root cause is likely that task creation failed silently during PSSR submission (the error is only `console.error`'d at line 915 of CreatePSSRWizard.tsx), and the self-healing mechanism in `PSSRReviewsPanel` only runs when the **lead user themselves** logs in and views the panel -- it does not fix tasks for other users.

## Plan

### 1. Broaden Self-Healing to the PSSR Summary Page

Currently, self-healing only runs in `PSSRReviewsPanel` (dashboard task panel) and only for the logged-in user. Add a similar self-healing check on the **PSSR Summary Page** (`PSSRSummaryPage.tsx`) that runs once on mount:

- Query all PSSRs with status `PENDING_LEAD_REVIEW` that have a `pssr_lead_id` set.
- For each, check if a matching `user_tasks` record exists (type=review, status=pending, metadata pssr_id match).
- If missing, insert the review task for that lead.

This ensures that when an admin or any user views the PSSR list, orphaned "Pending Lead Review" PSSRs get their tasks auto-created.

### 2. Make Task Creation in the Wizard More Resilient

In `CreatePSSRWizard.tsx` (around line 897), the task insertion error is silently logged. Enhance this to:

- Retry once on failure.
- Surface a toast warning if the task still fails, so the user knows the lead may not have been notified.

### 3. Files to Modify

- **`src/components/PSSRSummaryPage.tsx`** -- Add a `useEffect` self-healing hook that checks for PSSRs in PENDING_LEAD_REVIEW without corresponding tasks and creates them.
- **`src/components/pssr/CreatePSSRWizard.tsx`** -- Add a retry and toast warning for task creation failure.

### Technical Details

The self-healing query in PSSRSummaryPage will:
1. Fetch all PSSRs where `status = 'PENDING_LEAD_REVIEW'` and `pssr_lead_id IS NOT NULL`.
2. For each PSSR, query `user_tasks` for a matching pending review task.
3. Insert missing tasks with the same metadata structure used in the wizard (source: pssr_workflow, action: review_draft_pssr).
4. Invalidate the `user-tasks` query cache if any tasks were created.

This runs once per page load with a `useRef` guard to prevent repeated execution, matching the existing pattern in `PSSRReviewsPanel`.

