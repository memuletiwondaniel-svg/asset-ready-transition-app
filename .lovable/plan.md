

# Fred Training Strategy — Completions & Commissioning SME

## Overview

Build a document-driven knowledge pipeline for Fred, mirroring Selma's proven "Autonomous Knowledge Builder" pattern. Users upload domain documents (14 categories), the system ingests, analyzes, and persists structured knowledge that is injected into Fred's system prompt at runtime. Fred becomes a deep Completions & Commissioning SME without hardcoding company names.

## Current State

- Fred has **static domain knowledge** hardcoded in `prompt.ts` (certificate hierarchy, ITR matrix, punchlist categories)
- Fred has **live GoCompletions tools** for real-time data
- Fred has **no document-based learning pipeline** — unlike Selma who has `selma-knowledge-builder` + `selma_document_type_knowledge` table
- Fred's prompt contains **company-specific references** (BGC, Shell) that violate neutrality policy

## Architecture

```text
┌─────────────────────────────────────────────────────┐
│  User uploads documents (14 categories)             │
│  via Admin UI → Supabase Storage bucket             │
└──────────────────┬──────────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │ fred_training_queue │  (DB table — tracks ingestion)
         │ category, status,   │
         │ file_path, priority │
         └─────────┬──────────┘
                   │
        ┌──────────▼───────────────┐
        │ fred-knowledge-builder   │  (Edge Function — scheduled + manual)
        │  1. Download doc from    │
        │     storage              │
        │  2. Parse via Claude     │
        │  3. Extract structured   │
        │     domain knowledge     │
        │  4. Sanitize company     │
        │     names                │
        │  5. Persist to           │
        │     fred_domain_knowledge│
        └──────────┬───────────────┘
                   │
      ┌────────────▼────────────────┐
      │ fred_domain_knowledge       │  (DB table — persistent knowledge)
      │ category, knowledge_type,   │
      │ content (JSONB), confidence │
      └────────────┬────────────────┘
                   │
        ┌──────────▼──────────┐
        │ context-loader.ts   │  (Runtime injection into Fred's prompt)
        │ Loads knowledge by  │
        │ category, injects   │
        │ into system prompt  │
        └─────────────────────┘
```

## Document Categories & Knowledge Extraction

Each category extracts different structured knowledge:

| # | Category | Knowledge Extracted |
|---|----------|-------------------|
| 1 | LOSH Drawings | System boundary definitions, tag-to-subsystem mappings, interface points |
| 2 | Completions Management Procedure | Phase gate rules, roles/responsibilities, approval workflows, exception processes |
| 3 | The Logic Way | Completions philosophy, sequencing logic, decision trees |
| 4 | CSU Masterclass | Pre-commissioning procedures, commissioning sequence, best practices, common pitfalls |
| 5 | Blank ITRs | ITR structure per code (fields, checkpoints, sign-off requirements, acceptance criteria) |
| 6 | Managing Repetitive Failure | Failure patterns, root cause categories, prevention strategies |
| 7 | Commissioning Lessons Learnt | Historical lessons, categorized by discipline/phase/equipment |
| 8 | Flaws Database | Common flaw types, severity classifications, remediation approaches |
| 9 | CSI Database | Incident categories, contributing factors, preventive measures |
| 10 | CTPs (Commissioning Test Procedures) | Test procedure structure, acceptance criteria, equipment-specific protocols |
| 11 | SAT/FAT/SIT Reports | Acceptance test structure, pass/fail criteria, common findings |
| 12 | Appomattox CSU Plans | Full commissioning plan structure, phasing, resource planning templates |
| 13 | HAZOP/OMAR Reports | Risk identification patterns, safeguard requirements, action close-out |

## Implementation Plan

### Step 1: Database Schema (Migration)

Create three tables:

- **`fred_training_queue`** — Tracks document ingestion status (mirrors `selma_training_queue`)
  - `id`, `file_path`, `category` (enum of 13 categories), `status` (pending/in_progress/completed/failed), `priority`, `error_details`, `created_at`

- **`fred_domain_knowledge`** — Persistent extracted knowledge
  - `id`, `category`, `knowledge_type` (procedure/lesson/itr_template/test_criteria/incident/failure_pattern), `title`, `content` (JSONB), `source_file`, `confidence`, `tags` (text[]), `created_at`, `updated_at`

- **`fred_training_documents`** — Document metadata registry
  - `id`, `file_name`, `file_path`, `category`, `file_size`, `uploaded_by`, `uploaded_at`

Plus a storage bucket `fred_training_docs`.

### Step 2: Knowledge Builder Edge Function

Create `fred-knowledge-builder` edge function that:

1. Pulls next pending items from `fred_training_queue`
2. Downloads document from storage
3. Parses via `document--parse_document` approach (or sends to Claude directly for text-based content)
4. Uses category-specific extraction prompts (e.g., for ITRs: extract checkpoints, sign-off fields, discipline; for lessons learnt: extract lesson, root cause, recommendation)
5. **Sanitizes all company names** — replaces BGC/Shell/Basrah Gas Company with neutral terms ("the Company", "the Asset Owner", "the Project")
6. Upserts results into `fred_domain_knowledge`

### Step 3: Fred Context Loader

Create `_shared/fred/context-loader.ts` (mirrors Selma's pattern):

1. At runtime, loads relevant knowledge rows from `fred_domain_knowledge` based on the user's query context
2. Injects into Fred's system prompt as structured domain knowledge blocks
3. Prioritizes by category relevance (e.g., ITR query → load ITR templates + lessons learnt for that discipline)

### Step 4: Prompt Sanitization

Update `FRED_SYSTEM_PROMPT` to:
- Remove all BGC/Shell-specific references
- Use neutral project identifiers
- Add instruction: "Never reference specific company names from training documents"

### Step 5: Admin UI — Fred Training Dashboard

Add a training management page (similar to Selma's Knowledge Training tab):
- Upload documents with category tagging
- View ingestion queue status
- Browse extracted knowledge
- Trigger manual training runs
- View knowledge coverage per category

### Step 6: Query-Aware Knowledge Injection

Update the `ai-chat` handler so that when Fred is the active agent:
- Detect query topic (ITR, punchlist, commissioning, lessons learnt, etc.)
- Load only relevant knowledge slices (not the entire knowledge base)
- Append as context blocks in the system prompt

## Neutrality Enforcement

The knowledge builder will apply these sanitization rules before persisting:

```text
BGC → "the Company" or "the Asset Owner"
Shell → "the Operator" or "the JV Partner"
Basrah Gas Company → "the Company"
Iraq Southern Gas → "the Project Entity"
BNGL/Zubair/etc. → preserved as project codes only (functional identifiers)
```

## Technical Details

- Storage bucket: `fred_training_docs` (private, RLS: authenticated upload, service_role read)
- Knowledge builder: Processes 3 documents per invocation (conservative for token limits)
- Category-specific Claude prompts ensure structured extraction per document type
- Confidence scoring: based on extraction completeness (0-1 scale)
- Deduplication: knowledge entries keyed by `(category, title, source_file)`

