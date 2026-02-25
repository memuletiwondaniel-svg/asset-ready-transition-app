

## Plan: Streamline Step 1 and Move PSSR Lead to Step 2

Three changes across two files to reduce scroll on Step 1 and improve layout:

### 1. Move Deactivate/Activate/Reactivate actions to the footer row

**File: `src/components/pssr/EditPSSRReasonOverlay.tsx`**

- Remove the large status action cards from Step 1 content area (lines 518-575 — the `{currentStep === 1 && ...}` block with draft/active/inactive cards)
- Add a compact Deactivate/Activate button in the footer bar (line 578 area), next to the existing Delete button on the left side
  - For `active` status: show an "Deactivate" button styled with `text-amber-600` and warning icon
  - For `draft` status: show an "Activate" button styled with `text-green-600`
  - For `inactive` status: show a "Reactivate" button styled with `text-green-600`
  - When clicking Deactivate on an active template with existing PSSRs, show a confirmation dialog warning that it will no longer be available for new PSSRs
- This frees up significant vertical space on Step 1

### 2. Move PSSR Lead Role selector from Step 1 to Step 2

**File: `src/components/pssr/wizard/WizardStepReasonDetails.tsx`**

- Remove the PSSR Lead Role selector section (the `<Shield>` labeled popover and matching profiles preview) from this component
- Remove the `pssrLeadId`, `onPssrLeadChange` props
- Step 1 will now contain only: PSSR Reason cards + Other input + Additional Description

**File: `src/components/pssr/wizard/WizardStepApprovers.tsx`**

- Add the PSSR Lead Role selector at the top of the Step 2 (PSSR Approvers) component, only when `type="pssr"`
- Add new optional props: `pssrLeadRoleId?: string`, `onPssrLeadRoleChange?: (id: string) => void`
- Render the Shield-labeled popover and matching profiles preview above the approver role list

**File: `src/components/pssr/EditPSSRReasonOverlay.tsx`**

- Remove `pssrLeadId` and `onPssrLeadChange` from the `WizardStepReasonDetails` props on Step 1
- Pass `pssrLeadRoleId={pssrLeadId}` and `onPssrLeadRoleChange={setPssrLeadId}` to the Step 2 `WizardStepApprovers` component

**File: `src/components/pssr/AddPSSRReasonWizard.tsx`**

- Same prop changes: remove from Step 1, add to Step 2

### 3. Show "Other" custom input inline

Already working correctly — when the "Other" card is selected, a text input appears below. No changes needed here.

### Summary of UX improvements
- Step 1 becomes much shorter: just reason cards + description — no scrolling needed
- Status actions (activate/deactivate) move to footer for persistent access from any step
- PSSR Lead Role lives with PSSR Approvers (Step 2) which is its natural grouping

### Technical Details

- No database changes required
- Props interface changes on `WizardStepReasonDetails` (remove `pssrLeadId`, `onPssrLeadChange`) and `WizardStepApprovers` (add optional `pssrLeadRoleId`, `onPssrLeadRoleChange`)
- The deactivation confirmation dialog (for active templates) reuses the existing `AlertDialog` pattern
- Files modified: `EditPSSRReasonOverlay.tsx`, `AddPSSRReasonWizard.tsx`, `WizardStepReasonDetails.tsx`, `WizardStepApprovers.tsx`

