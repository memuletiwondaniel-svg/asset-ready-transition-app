

# Add Step 5 "Final Review" to the PSSR Wizard for Lead Review Mode

## Problem
When the PSSR Lead opens the wizard via "Review & Edit PSSR", Step 4 still shows "Submit for Review" -- which is the creator's action. The Lead should instead see a "Final Review" button that transitions to an embedded preview of the PSSR detail view (Step 5), with options to approve or go back to edit.

## Solution
Add a `mode` prop to `CreatePSSRWizard` to distinguish between `"create"` (default) and `"lead-review"` modes. In lead-review mode:

- Add a **Step 5: "Final Review"** that embeds the `PSSRDetailOverlay` content inline within the wizard
- Step 4's CTA changes from "Submit for Review" to "Final Review" (proceeds to Step 5)
- Step 5 shows the PSSR detail view (Overview, Checklist, SoF Certificate) with two CTAs: "Back to Edit" (returns to Step 4) and "Approve PSSR" (performs the lead approval action)

## Changes

### 1. `src/components/pssr/CreatePSSRWizard.tsx`

**Props**: Add `mode?: 'create' | 'lead-review'` (default `'create'`).

**STEPS constant**: Make it dynamic -- in lead-review mode, append a 5th step:
```
{ id: 5, title: 'Final Review', description: 'Review & approve' }
```

**Step 4 footer (last step logic)**: Currently checks `currentStep < STEPS.length` to decide between "Next" and "Submit for Review". Changes:
- In **create mode**: behavior stays the same (Step 4 = last step, shows "Submit for Review")
- In **lead-review mode**: Step 4 shows "Final Review" button (acts as "Next" to Step 5). Step 5 becomes the last step with an "Approve PSSR" CTA

**Step 5 content**: When `currentStep === 5` and mode is `lead-review`, render an inline version of the PSSR detail panels (reuse `PSSRDetailContent` or embed the overlay's tab view). This gives the Lead a read-only preview of how everything looks, including the SoF certificate.

**Step 5 footer**:
- Left: "Back" button returns to Step 4
- Right: "Approve PSSR" button that triggers the lead approval workflow (transitions PSSR to UNDER_REVIEW, completes the task)

**Breadcrumb/progress bar**: Extends to show 5 steps in lead-review mode.

### 2. `src/components/tasks/TaskDetailSheet.tsx`

- Pass `mode="lead-review"` to the `CreatePSSRWizard` component
- Remove the separate `PSSRDetailOverlay` since Step 5 now serves as the final review
- Remove the `pssrOverlayOpen` state and the auto-transition logic in `onOpenChange`
- Add an `onSuccess` callback to handle post-approval navigation (e.g., close the sheet, refresh tasks)

### 3. `src/components/pssr/PSSRDetailOverlay.tsx` (minor)

Extract the inner content (tabs: Overview, Checklist, SoF Certificate) into a reusable `PSSRDetailContent` component that can be rendered both inside the overlay dialog and inside the wizard's Step 5. If the content is already well-separated, we can import the relevant tab panels directly.

## Flow Diagram

```text
Creator Flow (mode="create"):
  Step 1 -> Step 2 -> Step 3 -> Step 4 [Submit for Review]

Lead Review Flow (mode="lead-review"):
  Step 1 -> Step 2 -> Step 3 -> Step 4 [Final Review] -> Step 5 [Approve PSSR / Back]
                                                          (embedded detail view)
```

## Technical Notes
- The wizard title changes from "Create New PSSR" to "Review PSSR" in lead-review mode
- Step 5 in lead-review mode hides "Save as Draft" since the Lead shouldn't create drafts
- The approval action in Step 5 reuses existing approval logic from the task workflow (status transition to UNDER_REVIEW, task completion)
