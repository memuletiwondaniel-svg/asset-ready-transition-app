

# VCR Plan Workflow — Current Status and Completion Roadmap

## What's Already Built

All 8 wizard steps exist and are functional:

| Step | Component | Status |
|------|-----------|--------|
| 1. VCR Items | `VCRItemsStep.tsx` | Built — prerequisite checklist items |
| 2. Training | `TrainingStep.tsx` | Built — training records with add wizard |
| 3. Procedures | `ProceduresStep.tsx` | Built — procedure identification |
| 4. Critical Documents | `CriticalDocumentsStep.tsx` + `CriticalDocsWizard` (3-step sub-wizard) | Built — tier badges, RLMU status badges, document selection by discipline/package |
| 5. Op. Registers | `OperationalRegistersStep.tsx` | Built — catalog-based selection |
| 6. Logsheets | `LogsheetsStep.tsx` | Built — manual entry with display order |
| 7. ITP | `InspectionTestPlanStep.tsx` | Built — witness/hold points per system |
| 8. Approvers | `ApproversStep.tsx` | Built — auto-resolved from personnel with region/plant matching |

Supporting infrastructure: wizard shell, progress sync to `ora_plan_activities` and `user_tasks`, step completion tracking, save-and-exit, VCR ID badges.

## What's NOT Yet Built (the Selma Integration Layer)

The wizard captures *what* is needed but lacks intelligence, automation, and lifecycle tracking. Here is the remaining work, organized into 4 implementation phases:

### Phase 1 — Schema Foundation (1 session)
- Add `rlmu_status`, `rlmu_file_path`, `dms_status`, `document_number`, `document_type_code` columns to `p2a_vcr_register_selections` and `p2a_vcr_logsheets`
- Add `assigned_document_number` to `vcr_document_requirements`
- Create `rlmu_reviews` table (polymorphic: covers critical docs, registers, logsheets)
- Create `dms_reserved_numbers` table for document number reservation
- Create `rlmu-uploads` storage bucket
- Add trigger: auto-set `rlmu_status = 'pending'` when linked doc type has `rlmu = 'Yes'`

### Phase 2 — Selma Tools and Prompt (2-3 sessions)
- **`check_vcr_document_readiness`** tool — queries all 3 deliverable tables, joins `dms_document_types` for tier/RLMU, checks Assai live status, returns unified readiness report
- **`get_checklist_document_insights`** tool — cross-references checklist items with live document status, provides actionable recommendations
- **`assign_document_numbers`** tool — reserves next sequential 9-segment numbers in `dms_reserved_numbers`
- **`organize_project_documents`** tool — hierarchical views by discipline or package
- Update `prompt.ts` with Tier 1/2 domain knowledge, RLMU lifecycle rules, proactive recommendation patterns
- Add tool handlers in `ai-chat/index.ts`

### Phase 3 — RLMU Review Automation (1-2 sessions)
- New edge function `selma-rlmu-reviewer` using Claude Vision
- Checks: RLMU stamp, scan quality, redline completeness, document number match
- On pass: auto-creates DC upload task
- On fail: creates specific remediation tasks with full history
- Wire into upload flow across all 3 deliverable steps

### Phase 4 — UI Enhancements (2-3 sessions)
- **CriticalDocumentsStep**: add RLMU file upload action, Selma review results display, "Assign Numbers" button for new documents
- **OperationalRegistersStep**: add document number, DMS status badge, RLMU status badge, upload action
- **LogsheetsStep**: same DMS enhancements as registers
- **TaskDetailSheet**: handle `rlmu_upload` task type with integrated review feedback
- **ProjectDocumentBrowser**: new component for discipline/package document organization
- Proactive notifications: Selma suggests VCR item completion when all categories are ready

## Estimated Timeline

| Phase | Effort | Dependency |
|-------|--------|------------|
| Phase 1 — Schema | 1 session | None |
| Phase 2 — Selma Tools | 2-3 sessions | Phase 1 |
| Phase 3 — RLMU Reviewer | 1-2 sessions | Phase 1 |
| Phase 4 — UI | 2-3 sessions | Phases 1-3 |

**Total: approximately 6-9 sessions to complete the full Selma-integrated VCR Plan workflow.**

The basic wizard flow (capture what's needed) is done. What remains is the intelligence layer — making Selma an active participant that tracks readiness, reviews uploads, assigns numbers, and proactively advises users.

