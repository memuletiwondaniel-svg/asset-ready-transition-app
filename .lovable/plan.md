

## Plan: Add Submission Comments & Redesign Review Step Layout

### Problem
The Review & Submit step (Step 7 / WorkspacePreviewStep) has no way for the task owner to add comments before submitting. The approvers list is single-column, wasting horizontal space.

### Design (Enterprise SaaS Pattern)
Adopt a **two-panel layout** for the bottom section of the review step:

- **Left panel**: Approvers in a compact 2-column grid (avatar + name + role inline per card)
- **Right panel**: Submission comments textarea with a label like "Notes for Approvers (optional)"

This mirrors patterns from Jira, ServiceNow, and Monday.com where submission forms include a notes/comments field alongside reviewer assignments.

### Steps

**1. Add `submissionComment` state to the wizard** (`P2APlanCreationWizard.tsx`)
- Add a `submissionComment` string state
- Pass it as prop to `WorkspacePreviewStep`
- Pass it to `submitForApproval()` call

**2. Store the submission comment** (`useP2APlanWizard.ts`)
- Update `submitForApproval` to accept an optional `submissionComment` parameter
- After plan submission, insert a comment record into `p2a_approver_history` (or a dedicated field on the plan) so it's visible in the activity feed as a "Submission Note"
- Use `p2a_handover_plans.submission_comments` column if it exists, or store as a history entry with `role_name: 'Submitter'` and `status: 'SUBMITTED'`

**3. Redesign `WorkspacePreviewStep.tsx`** layout
- Wrap the "Selected Approvers" and new "Submission Notes" sections in a **2-column grid** (`grid grid-cols-1 md:grid-cols-2 gap-4`)
- **Left column**: Approvers in a 2-column sub-grid (`grid grid-cols-2 gap-1.5`) — compact cards with avatar, name, role on one line
- **Right column**: Textarea for submission comments — label "Notes for Approvers", placeholder "Add any context or instructions for the approval team...", optional, max 500 chars
- Pass an `onCommentChange` callback prop to bubble the value up

**4. Persist comment in activity feed**
- When `submitForApproval` runs, insert the comment (if non-empty) as a history/activity entry so it appears in `ORAActivityTaskSheet` timeline with the submitter's name and "Submitted with note" context

### Files Modified
- `src/components/widgets/p2a-wizard/steps/WorkspacePreviewStep.tsx` — 2-col layout + textarea
- `src/components/widgets/p2a-wizard/P2APlanCreationWizard.tsx` — state + prop wiring
- `src/hooks/useP2APlanWizard.ts` — accept & persist comment on submit

