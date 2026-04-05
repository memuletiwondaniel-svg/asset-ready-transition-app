

# Plan: Trigger Edge Functions + Generate Selma Technical Specification PDF

## Part 1: Trigger Edge Functions

Invoke the two Selma background functions to populate fresh data:

1. **selma-knowledge-builder** — POST to resume processing the 568 pending document types in the training queue (unstick the `in_progress` item first by sending `reset_type_code` if needed)
2. **selma-performance-scorer** — POST to compute KPI snapshots from recent `selma_interaction_metrics`

## Part 2: Generate Comprehensive Selma PDF

Create a professional technical specification PDF (~20-30 pages) using Python/reportlab, covering every aspect of Selma's architecture. The document will be structured as follows:

### Document Structure

**1. Cover Page**
- Title: "SELMA — Document Intelligence Agent: Technical Specification"
- Version, date, classification (Internal / Confidential)

**2. Executive Summary**
- What Selma is, her role in ORSH, key capabilities at a glance

**3. Agent Identity & Personality**
- Name, persona (Arabic woman in hijab), warm/intelligent personality
- Relationship to other agents (Bob, Fred, Ivan, Hannah, Alex)
- DMS Gateway principle — Selma is the exclusive interface to Assai

**4. System Architecture (v6.0)**
- Edge function: `ai-chat/index.ts` (modular import of Selma modules)
- Claude model: `claude-sonnet-4-5-20250929`
- Streaming: SSE with 15s heartbeat, 148s processing window, 25 iterations
- Intent classification: Regex-first, LLM-fallback (Haiku)
- Guaranteed Response Builder for LLM failures
- Structured response JSON blocks for UI stability

**5. Core Modules**
- `_shared/selma/prompt.ts` — System prompt (full content reference)
- `_shared/selma/tools.ts` — 10 tool definitions
- `_shared/selma/handlers.ts` — Tool executors (1312 lines)
- `_shared/selma/search-engine.ts` — SEARCH_V11 engine (938 lines)
- `_shared/selma/context-loader.ts` — DMS config snapshot builder

**6. Session Management**
- `SessionManager` class: 50-query / 90s refresh threshold
- `label.aweb` warmup after every re-auth (with `subclass_type`)
- Credential retrieval from `dms_sync_credentials` (encrypted, AES decryption)
- Assai instance: `eu578` at `https://eu.assaicloud.com/AWeu578/`

**7. Search Engine (SEARCH_V11)**
- SearchContext interface and state management
- 6-strategy search cascade (exact → type+project → type-all → title → originator → broad)
- Dual-module search: DES_DOC + SUP_DOC
- Pagination: 500-page capacity, `number_of_results=500`
- Bracket-matching myCells parser (robust for large HTML)
- TR/TD fallback parser
- Total count extraction

**8. Tool Reference (All 10 Tools)**
Table with: tool name, description, input schema, handler logic summary
- `resolve_document_type` — Levenshtein fuzzy matching, cross-discipline auto-combine
- `resolve_project_code` — DP number normalization
- `search_assai_documents` — delegates to SEARCH_V11
- `read_assai_document` — 7-stage pipeline (search → SUP_DOC fallback → REST download → legacy fallback → magic byte validation → base64 encoding → Claude analysis)
- `discover_project_vendors` — delegates to discover-vendors function
- `learn_acronym` — persists to `dms_document_type_acronyms`
- `check_vcr_document_readiness` — unified readiness across 3 categories
- `get_checklist_document_insights` — cross-reference checklist vs documents
- `assign_document_numbers` — 9-segment number reservation
- `organize_project_documents` — hierarchical views

**9. DMS Connection & Assai Integration**
- Authentication flow (form-based login, cookie management)
- Download protocol: REST GET → legacy `download.aweb` fallback
- Cabinet resolution from `dms_projects` table
- Redirect detection (301/302 = session failure)
- Magic byte validation (PDF: 0x25504446, ZIP: 0x504B, OLE: 0xD0CF)
- 100-page PDF limit handling (automatic truncation)

**10. Document Lifecycle Standards**
- Revision format: numeric suffix (01R, 02A, 03C)
- Status lifecycle: IFR → IFA → IFC/AFC → RLM → ASB
- Tier classification (Tier 1/2 for RLMU gating)
- RLMU lifecycle: not_applicable → pending → uploaded → under_review → approved/rejected
- Color standards: Red (additions), Blue (deletions)

**11. VCR Integration**
- Three deliverable categories: Critical Documents, Operational Registers, Logsheets
- Unified readiness pipeline
- Document number assignment (9-segment format)
- RLMU review via `selma-rlmu-reviewer` (Claude Vision)
- Checklist correlation tools

**12. PSSR Integration**
- Checklist document insights via `get_checklist_document_insights`
- Cross-reference of PSSR items with live DMS status

**13. Autonomous Knowledge Builder**
- Edge function: `selma-knowledge-builder`
- pg_cron schedule: daily 10:00 AM UTC, batch of 5
- Knowledge extraction prompt (structured JSON output)
- Training queue: `selma_training_queue` table
- Knowledge storage: `selma_document_type_knowledge` table
- Context injection via `context-loader.ts`

**14. Performance Scoring & Self-Improvement**
- Edge function: `selma-performance-scorer`
- pg_cron schedule: daily 11:00 AM UTC
- 10 KPIs computed: retrieval_success_rate, first_stage_hit_rate, mean_time_to_answer_ms, download_success_rate, analysis_completion_rate, user_satisfaction_index, strategy_efficiency, outcome_distribution, mean_search_latency_ms, mean_download_latency_ms
- Source: `selma_interaction_metrics` → `selma_kpi_snapshots`
- Learned strategies: `selma_learned_strategies` table

**15. Daily Sync**
- Edge function: `selma-daily-sync`
- Change detection: new docs, status changes, revision updates
- VCR-critical flagging
- Sync to `dms_external_sync` and `dms_sync_changes`

**16. Validation Suite**
- Edge function: `validate-selma`
- 31 tests across 4 tiers: core identity, pagination, Read & Analyze, learning
- Ghost System checks for legacy code references
- 3-layer routing protocol validation

**17. UX Presentation Standards**
- Lead with the Answer, Progressive Disclosure
- Mandatory 3-turn Read & Analyze flow (search → confirm → analyse)
- Follow-up suggestions via `<follow_ups>` XML tags
- Mandatory document links (Open in Assai, Download)
- Table format: max 10 rows default

**18. Database Schema Reference**
Table listing all Selma-related tables with columns and purposes:
- `selma_interaction_metrics`, `selma_kpi_snapshots`, `selma_learned_strategies`
- `selma_training_queue`, `selma_document_type_knowledge`, `selma_config_snapshot`
- `dms_*` tables (projects, document_types, acronyms, sync, etc.)

**19. Error Handling & Resilience**
- 429/5xx automatic retries with backoff
- Session exhaustion detection
- Redirect-as-failure pattern
- Guaranteed Response Builder
- Download timeout (15s per attempt)

**20. Configuration & Secrets**
- Required secrets: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- Assai credentials in `dms_sync_credentials` (encrypted)
- No JWT verification (pg_cron pattern)

### Technical Approach
- Use Python with `reportlab` to generate a professional multi-page PDF
- Include code snippets for key interfaces and type definitions
- Include architecture diagrams (text-based)
- Output to `/mnt/documents/selma-technical-specification.pdf`
- QA via `pdftoppm` visual inspection

