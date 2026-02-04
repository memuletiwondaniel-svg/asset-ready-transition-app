

# P2A Handover Plan Creation Wizard

## Overview
This feature enhances the VCRs & Handovers widget to provide a guided wizard experience for creating P2A Handover Plans when no VCRs exist. The wizard takes users through a step-by-step process to set up their project handover workflow, from importing systems to requesting approvals.

## Current State
- The `PSSRSummaryWidget` (VCRs & Handovers) shows VCRs from the database
- When no VCRs exist, it shows "No VCRs created yet" with a "New VCR" button
- The P2A Workspace (`P2AHandoverWorkspace.tsx`) already has sophisticated drag-and-drop functionality
- Hooks exist for systems, phases, VCRs, and approvers management
- A `user_tasks` table exists for task management integration

## Changes Required

### 1. Update VCRs & Handovers Widget (PSSRSummaryWidget.tsx)

**Conditional UI Based on VCR Existence:**
- When `allVCRs.length === 0`: Hide "New VCR" and "P2A Handover Plan" buttons; show "Create P2A Handover Plan" prompt
- When VCRs exist: Show current behavior plus a status badge for the P2A plan (Draft/In Review/Approved)
- Display VCRs with their current status (Draft for newly created ones)

### 2. Create P2A Plan Creation Wizard Component

**New Component:** `src/components/widgets/p2a-wizard/P2APlanCreationWizard.tsx`

**Wizard Steps:**

**Step 1: Project Overview**
- Display project info (ID, name, milestones)
- Show summary of what the wizard will help create
- Option to choose: "Guided Wizard" or "Open Interactive Workspace" (blank canvas)

**Step 2: Systems Import**
- Import from GoCompletions (API integration placeholder)
- Manual entry/create systems (name, description, is_hydrocarbon flag)
- Excel import (reuse existing AddSystemDialog patterns)
- List of added systems with ability to edit/remove

**Step 3: VCR Creation**
- Create multiple VCRs with:
  - Name
  - Reason/description
  - Target milestone selection (from project milestones)
- Auto-generated VCR codes

**Step 4: System-to-VCR Mapping**
- Visual interface to drag systems into VCRs
- Checklist-style UI showing which systems are mapped
- Allow systems to be assigned to multiple or single VCRs

**Step 5: VCR Sequencing/Phase Mapping**
- Create phases or map VCRs to project milestones
- Timeline visualization showing sequence
- Drag-and-drop ordering

**Step 6: Interactive Workspace Preview**
- Full P2A Workspace view with visual mapping
- Interconnecting lines between systems, VCRs, and phases
- Edit, drag-drop, add, or delete capabilities
- "Continue to Review" button

**Step 7: Review & Approval Setup**
- Summary of plan contents (systems, VCRs, phases)
- Default approvers list:
  - Project Hub Lead
  - ORA Lead
  - CSU Lead
  - Construction Lead
  - Deputy Plant Director
- Ability to add/remove/reorder approvers
- "Request Approval" button

**Step 8: Confirmation**
- Final review showing:
  - Plan summary
  - Approval workflow participants
  - Status indication
- "Submit for Approval" action
- Creates tasks in approvers' My Tasks page

### 3. New Supporting Components

**File Structure:**
```
src/components/widgets/p2a-wizard/
├── P2APlanCreationWizard.tsx (main wizard dialog)
├── steps/
│   ├── ProjectOverviewStep.tsx
│   ├── SystemsImportStep.tsx
│   ├── VCRCreationStep.tsx
│   ├── SystemMappingStep.tsx
│   ├── VCRSequencingStep.tsx
│   ├── WorkspacePreviewStep.tsx
│   ├── ApprovalSetupStep.tsx
│   └── ConfirmationStep.tsx
├── WizardProgress.tsx (step indicator)
└── WizardNavigation.tsx (back/next/save buttons)
```

### 4. New/Updated Hooks

**New Hook:** `src/hooks/useP2APlanWizard.ts`
- Manages wizard state across steps
- Save progress at any step
- Auto-save functionality
- Resume from saved state

**Update:** `src/hooks/useP2AHandoverApprovers.ts`
- Update DEFAULT_APPROVERS to match new roles:
  ```typescript
  const DEFAULT_APPROVERS = [
    { role_name: 'Project Hub Lead', display_order: 1 },
    { role_name: 'ORA Lead', display_order: 2 },
    { role_name: 'CSU Lead', display_order: 3 },
    { role_name: 'Construction Lead', display_order: 4 },
    { role_name: 'Deputy Plant Director', display_order: 5 },
  ];
  ```

**New Hook:** `src/hooks/useP2AApprovalTasks.ts`
- Create approval tasks in `user_tasks` table when approval is requested
- Link tasks to specific approvers
- Include metadata for navigation to approval view

### 5. Database Considerations

**Existing Tables (no schema changes needed):**
- `p2a_handover_plans`: status column supports DRAFT, ACTIVE, COMPLETED, ARCHIVED
- `p2a_handover_approvers`: stores approvers with status tracking
- `p2a_systems`, `p2a_handover_points`, `p2a_project_phases`: existing structure works
- `user_tasks`: can store approval tasks with metadata

**New Status Values (verify enum includes):**
- Plan status: DRAFT → IN_REVIEW → APPROVED/REJECTED

### 6. Workflow Integration

**When "Request Approval" is clicked:**
1. Update plan status to 'IN_REVIEW'
2. Create tasks in `user_tasks` for each approver with:
   - `type: 'P2A_PLAN_APPROVAL'`
   - `metadata: { plan_id, project_id, approver_role }`
   - Links to approval view
3. First approver is notified (sequential approval flow)

**In My Tasks Page:**
- Approval tasks appear for designated approvers
- Click navigates to P2A plan approval view
- Approve/Reject actions update status and notify next approver

### 7. Widget Status Display

After plan creation, the VCRs & Handovers widget shows:
- P2A Handover Plan button with status badge (Draft/In Review/Approved)
- VCRs listed with "Draft" status initially
- Progress indicators where applicable

---

## Technical Details

### Files to Create
1. `src/components/widgets/p2a-wizard/P2APlanCreationWizard.tsx`
2. `src/components/widgets/p2a-wizard/steps/ProjectOverviewStep.tsx`
3. `src/components/widgets/p2a-wizard/steps/SystemsImportStep.tsx`
4. `src/components/widgets/p2a-wizard/steps/VCRCreationStep.tsx`
5. `src/components/widgets/p2a-wizard/steps/SystemMappingStep.tsx`
6. `src/components/widgets/p2a-wizard/steps/VCRSequencingStep.tsx`
7. `src/components/widgets/p2a-wizard/steps/WorkspacePreviewStep.tsx`
8. `src/components/widgets/p2a-wizard/steps/ApprovalSetupStep.tsx`
9. `src/components/widgets/p2a-wizard/steps/ConfirmationStep.tsx`
10. `src/components/widgets/p2a-wizard/WizardProgress.tsx`
11. `src/components/widgets/p2a-wizard/WizardNavigation.tsx`
12. `src/hooks/useP2APlanWizard.ts`
13. `src/hooks/useP2AApprovalTasks.ts`

### Files to Modify
1. `src/components/widgets/PSSRSummaryWidget.tsx` - Conditional UI and wizard integration
2. `src/hooks/useP2AHandoverApprovers.ts` - Update default approvers list
3. `src/components/p2a-workspace/hooks/useP2AHandoverPlan.ts` - Add project_id linking and status updates

### UI/UX Patterns
- Match existing wizard design from `CreateVCRWizard.tsx`
- Progress indicator with step names and numbers
- Sticky navigation footer (Back/Next/Save buttons)
- Save progress at any point functionality
- Smooth transitions between steps
- Grouped sections with `bg-muted/30` backgrounds per project conventions

