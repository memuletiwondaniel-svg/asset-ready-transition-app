
# Selma-Powered VCR Plan Workflow — Unified Document Intelligence

## Phase 1 — Schema Foundation ✅ COMPLETE

- ✅ Added `assigned_document_number`, `rlmu_status`, `rlmu_file_path`, `rlmu_reviewed_at`, `rlmu_review_findings`, `dms_status` to `vcr_document_requirements`
- ✅ Added `document_number`, `document_type_code`, `dms_status`, `rlmu_status`, `rlmu_file_path` to `p2a_vcr_register_selections`
- ✅ Added `document_number`, `document_type_code`, `dms_status`, `rlmu_status`, `rlmu_file_path` to `p2a_vcr_logsheets`
- ✅ Created `rlmu_reviews` table (polymorphic: covers critical docs, registers, logsheets)
- ✅ Created `dms_reserved_numbers` table for document number reservation
- ✅ Created `rlmu-uploads` storage bucket (private)
- ✅ Added trigger: auto-set `rlmu_status = 'pending'` when doc type has `rlmu = 'Yes'`

## Phase 2 — Selma Tools and Prompt ✅ COMPLETE

### New Tools (added to `tools.ts` + handlers in `handlers.ts`)
1. ✅ **`check_vcr_document_readiness`** — queries `vcr_document_requirements`, `p2a_vcr_register_selections`, `p2a_vcr_logsheets`; joins `dms_document_types` for tier/RLMU; returns unified readiness report
2. ✅ **`get_checklist_document_insights`** — cross-references checklist items with live document status
3. ✅ **`assign_document_numbers`** — reserves sequential 9-segment numbers in `dms_reserved_numbers`
4. ✅ **`organize_project_documents`** — hierarchical views by discipline or package

### Prompt Updates
- ✅ Tier 1/2 domain knowledge
- ✅ RLMU lifecycle rules (pending → uploaded → under_review → approved/rejected)
- ✅ Registers and logsheets are DMS documents with same lifecycle
- ✅ Proactive recommendation patterns
- ✅ Tool routing updated in `ai-chat/index.ts`

## Phase 3 — RLMU Review Automation ✅ COMPLETE

- ✅ New edge function `selma-rlmu-reviewer` using Claude Vision (claude-sonnet-4-5)
- ✅ Checks: RLMU stamp, scan quality, redline completeness, document number match, revision indicator
- ✅ On pass: auto-creates DC upload task (`rlmu_upload` type)
- ✅ On fail: creates specific remediation tasks (`rlmu_remediation` type) with detailed findings
- ✅ Polymorphic source support for all 3 deliverable types
- ✅ Saves full audit trail to `rlmu_reviews` table
- ✅ Auto-updates `rlmu_status` on source row (approved/rejected/under_review)

## Phase 4 — UI Enhancements

- **CriticalDocumentsStep**: RLMU file upload, review results display, "Assign Numbers" button
- **OperationalRegistersStep**: document number, DMS status badge, RLMU status badge, upload action
- **LogsheetsStep**: same DMS enhancements as registers
- **TaskDetailSheet**: `rlmu_upload` task type with integrated review feedback
- **ProjectDocumentBrowser**: new component for discipline/package document organization
- Proactive notifications: Selma suggests VCR item completion when all categories are ready
