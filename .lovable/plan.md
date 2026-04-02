

# Selma Autonomous Knowledge Builder — Background Document Training

## The Idea

Selma currently reads documents **on-demand** (user asks → search → download → Claude analysis). The proposal is to have Selma **autonomously crawl Assai in the background**, downloading and reading representative documents of each type across projects, building a persistent **document type knowledge base** that makes her smarter over time.

## What Exists Today

| Component | Status |
|-----------|--------|
| `read_assai_document` handler | ✅ Full 7-stage pipeline (search → download → Claude analysis) |
| `selma-daily-sync` edge function | ✅ Runs daily, syncs metadata from Assai, tracks changes |
| `document_ingest_queue` table | ✅ Exists but only queues BOD/BDEP for future pgvector (Phase 9) |
| `selma_learned_strategies` table | ✅ Stores learned heuristics |
| `dms_document_types` table | ✅ Has all ~180 document type codes |
| Actual document content knowledge | ❌ Nothing persisted — every read is ephemeral |

**Gap**: When Selma reads a BfD today, the analysis is returned to the user and discarded. She learns nothing for next time.

## Architecture: Autonomous Knowledge Builder

```text
┌──────────────────────────────────────────────────────────┐
│          selma-knowledge-builder (edge function)         │
│  Triggered: daily cron, after selma-daily-sync           │
│                                                          │
│  1. Pick next unlearned document type from queue          │
│  2. Search Assai for 2-3 representative docs per type    │
│  3. Download + Claude analysis with knowledge prompt      │
│  4. Extract structured knowledge → persist to DB          │
│  5. Mark type as "learned", advance to next               │
└──────────────────────┬───────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│        selma_document_type_knowledge (new table)         │
│                                                          │
│  type_code: "5507"                                       │
│  type_name: "Basis for Design"                           │
│  purpose: "Defines design parameters, constraints..."    │
│  typical_structure: ["Design Basis", "Process Data"...]  │
│  key_themes: ["design pressure", "capacity", "ambient"]  │
│  handover_relevance: "Critical — defines acceptance..."  │
│  common_statuses: {"AFU": 60%, "IFA": 25%, "AFC": 15%}  │
│  avg_page_count: 45                                      │
│  cross_references: ["PFD", "P&ID", "HAZOP"]             │
│  selma_tips: "When users ask about BfDs, focus on..."   │
│  sample_projects: ["DP-164", "DP-223"]                   │
│  confidence: 0.85                                        │
│  last_trained_at: timestamp                              │
│  documents_analyzed: 3                                   │
└──────────────────────────────────────────────────────────┘
```

## How It Works

### Phase 1: Knowledge Table + Training Queue

**New table: `selma_document_type_knowledge`** — one row per document type code, storing structured knowledge extracted from real documents.

**New table: `selma_training_queue`** — tracks which document types have been trained, which are pending, and which specific documents were sampled.

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | |
| type_code | text | The document type code (e.g. "5507") |
| status | text | "pending", "in_progress", "completed", "failed" |
| priority | int | Higher = train first (BOD=1, P&ID=2, ITP=3...) |
| documents_sampled | jsonb | Which doc numbers were read |
| last_attempt | timestamptz | |
| error_details | text | If failed |

### Phase 2: Knowledge Builder Edge Function

**New edge function: `selma-knowledge-builder`**

Execution flow per invocation (processes **1 document type per run** to stay within edge function time limits):

1. Query `selma_training_queue` for next `pending` type (ordered by priority)
2. Mark it `in_progress`
3. Search Assai for that type code across 2-3 projects (using existing `executeSearch`)
4. Pick 2-3 documents with status AFU/AFC (most mature/reliable)
5. Download each via the existing REST pipeline in `handlers.ts`
6. Send to Claude with a **knowledge extraction prompt** (not the user-facing analysis prompt):
   - "What is the purpose of this document type?"
   - "What sections/structure does it typically contain?"
   - "What key engineering themes appear?"
   - "How does this relate to project handover?"
   - "What other document types does it reference?"
7. Merge/deduplicate insights across the 2-3 samples
8. Upsert into `selma_document_type_knowledge`
9. Mark queue entry `completed`

### Phase 3: Knowledge Injection into Selma's Context

**Modify `_shared/selma/context-loader.ts`**: After loading the DMS config snapshot, also load relevant knowledge entries from `selma_document_type_knowledge` and append them to the system prompt context. This gives Selma domain expertise without any latency hit (it's just a DB read at prompt construction time).

When a user asks about BfDs, Selma already knows: "A Basis for Design typically contains design parameters, process data sheets, and environmental conditions. Key themes include design pressure, ambient temperature ranges, and capacity specifications. It cross-references P&IDs and PFDs."

### Phase 4: Training Priority + Scheduling

**Priority order** (most critical for ORSH handover first):
1. Basis for Design (5507)
2. P&ID (various codes)
3. Inspection & Test Plans (ITP)
4. General Arrangements (GA)
5. Single Line Diagrams (SLD)
6. Equipment Data Sheets
7. ... remaining types in frequency order from `dms_external_sync`

**Scheduling**: Triggered daily by cron after `selma-daily-sync`. Processes 1 type per run. At ~180 types, full training completes in ~6 months. High-priority types finish in the first 2 weeks.

**Re-training**: Types can be re-queued after 90 days or when `documents_analyzed` is low and new projects have been added.

## Latency & Cost Impact

| Concern | Impact |
|---------|--------|
| User-facing latency | **Zero** — runs in background, knowledge is pre-loaded into context |
| Claude API cost | ~$0.05-0.15 per document type (2-3 docs × ~50 pages) |
| Total training cost | ~$15-25 for all 180 types |
| Context size increase | ~200-500 tokens per relevant type (loaded selectively) |
| Edge function time | 1 type per run, ~60-90s per invocation |

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Database migration | Create | `selma_document_type_knowledge` + `selma_training_queue` tables |
| `supabase/functions/selma-knowledge-builder/index.ts` | Create | Background training function |
| `supabase/functions/_shared/selma/context-loader.ts` | Modify | Inject learned knowledge into Selma's system prompt |
| `supabase/functions/_shared/selma/handlers.ts` | Modify | Extract download+analysis logic into reusable helper |
| `src/pages/admin/SelmaAnalytics.tsx` | Modify | Add "Knowledge Training" tab showing queue progress |

## Implementation Order

1. Database tables (migration)
2. Knowledge builder edge function (reuses existing Assai download infrastructure)
3. Context loader upgrade (inject knowledge at prompt time)
4. Cron scheduling (after selma-daily-sync)
5. Dashboard training progress tab

