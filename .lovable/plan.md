

# Critical Documents Wizard — Integrated with ORSH AI Agent

## Overview

Replace the current simple "Add Document" CTA in VCR Plan Step 4 (Critical Documents) with a 3-step wizard that intelligently guides users through document identification, leveraging the DMS backend tables and ORSH AI Agent integration.

## Current State

- **CriticalDocumentsStep.tsx** uses a flat list with a side-sheet "Add Document" form pulling from `p2a_vcr_doc_catalog`
- **DmsDocumentTypesTab.tsx** has 989 document types (36 Tier 1, 66 Tier 2, 887 untiered) with multi-category filter chips (Tier, Discipline, Vendor)
- VCR systems are linked via `p2a_handover_point_systems` → `p2a_systems`
- Handover plans store `project_code` and `plant_code`
- The ORSH AI Agent (Bob CoPilot + Document Specialist) is available via the `ai-chat` edge function

## Architecture

```text
CriticalDocumentsStep.tsx
  └── [Empty state / toolbar CTA]
        └── CriticalDocsWizard.tsx (new — 3-step dialog)
              ├── Step 1: ProjectContextStep  (verify codes + select DMS platforms)
              ├── Step 2: DocumentSelectionStep (system-by-system doc picker)
              └── Step 3: ReviewConfirmStep    (summary + confirm)
```

## Detailed Steps

### Step 1 — Project Context & DMS Configuration

**Pre-populated fields** (read from `p2a_handover_plans` via the VCR's parent plan):
- **Project Code** — dropdown from `projects` table, pre-selected based on plan's `project_code`
- **Plant Code** — dropdown from `plant` table, pre-selected based on plan's `plant_code`

**DMS Platform selection** (multi-select checkboxes):
- Options: Assai, Wrench, Documentum, SharePoint, Aconex, ProArc, Other
- Stored as metadata on the VCR or handover plan for AI agent context

**UI**: Clean fieldset layout with section headers, pre-populated values highlighted with a subtle "auto-detected" badge. A guidance banner at the top explains the workflow.

### Step 2 — Document Selection (System-by-System)

This is the core step. Key design decisions:

**System-by-system breakdown**:
- Left sidebar shows the VCR's linked systems (from `p2a_handover_point_systems`)
- User selects documents per system, with a tab/accordion for each system
- A "Select All Systems" option for documents common to all systems

**Document table** (reuses DMS filter logic from `DmsDocumentTypesTab`):
- Pulls from `dms_document_types` table (not the old `p2a_vcr_doc_catalog`)
- **Default filters ON**: Tier 1, Tier 2, Process (PX), Electrical (EA), Instrumentation (IN), Static equipment disciplines, Rotating equipment disciplines
- Same multi-category filter chip bar (Tier / Discipline / Vendor) with AND logic
- Search functionality
- Multi-select checkboxes on each row
- Selected count badge per system

**AI Enhancement** (ORSH Document Agent integration):
- An "AI Suggest" button that calls the ORSH Document Specialist agent to recommend relevant documents based on the system type (hydrocarbon vs non-hydrocarbon), discipline context, and VCR scope
- AI suggestions appear as pre-checked rows with a sparkle indicator — user can accept/reject

### Step 3 — Review & Confirm

- Grouped summary: documents organized by system
- Total count badge, breakdown by tier
- Ability to remove individual selections before confirming
- "Confirm & Save" bulk-inserts into `p2a_vcr_critical_docs` with system linkage

## Database Changes

1. **Add `system_id` column** to `p2a_vcr_critical_docs` — nullable UUID referencing `p2a_systems(id)`, to track which system a document applies to
2. **Add `dms_document_type_id` column** to `p2a_vcr_critical_docs` — nullable UUID referencing `dms_document_types(id)`, linking directly to the DMS master list instead of the old catalog
3. **Add `dms_platforms` column** (text array) to `p2a_handover_plans` — stores selected DMS platforms for AI context

## New Files

| File | Purpose |
|------|---------|
| `src/components/widgets/vcr-wizard/steps/critical-docs/CriticalDocsWizard.tsx` | Main 3-step wizard shell using existing `WizardShell` or a simpler horizontal stepper |
| `src/components/widgets/vcr-wizard/steps/critical-docs/ProjectContextStep.tsx` | Step 1 — project/plant verification + DMS platform selection |
| `src/components/widgets/vcr-wizard/steps/critical-docs/DocumentSelectionStep.tsx` | Step 2 — system-by-system document picker with DMS filters |
| `src/components/widgets/vcr-wizard/steps/critical-docs/ReviewConfirmStep.tsx` | Step 3 — review summary with remove capability |

## Modified Files

| File | Change |
|------|--------|
| `CriticalDocumentsStep.tsx` | Replace "Add Document" CTA with wizard launcher; keep existing list view for already-selected docs |
| `VCRExecutionPlanWizard.tsx` | Pass `projectCode` and `plantCode` down to the critical docs step |

## UI/UX Design Approach

- **Wizard dialog**: Fixed `max-w-5xl` / `h-[85vh]` matching existing wizard patterns
- **Horizontal stepper** at top (3 dots with labels) — clean, minimal, progress-aware
- **System sidebar** in Step 2: vertical pill tabs on left, document table on right (master-detail)
- **Filter bar**: Reuse the exact category-label-above-chips pattern from DMS admin
- **AI suggestions**: Subtle sparkle icon + "AI Recommended" badge on suggested rows, with a floating "Accept All Suggestions" action bar
- **Empty states**: Contextual guidance per system when no documents selected yet
- **Responsive**: On mobile, system tabs collapse to a dropdown selector (same pattern as VCR detail overlay)

