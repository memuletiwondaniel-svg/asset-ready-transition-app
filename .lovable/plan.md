

# Document AI Agent - Implementation Plan

## Overview

Build a **Document AI Agent** that understands the DMS configuration, queries document metadata tables, provides document readiness insights, and generates actionable recommendations. This agent will be designed as a **specialist agent** that integrates with the existing Bob CoPilot (the `ai-chat` edge function) via a multi-agent routing pattern.

## Architecture

```text
┌─────────────────────────────────────────────┐
│            ORSHChatDialog (Frontend)         │
│  (existing Bob chat UI - no changes needed) │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│          ai-chat Edge Function (Bob)        │
│  ┌───────────────────────────────────────┐  │
│  │  Agent Router (new)                   │  │
│  │  - Detects document/DMS intent        │  │
│  │  - Routes to Document Agent tools     │  │
│  └───────────┬───────────────────────────┘  │
│              │                              │
│  ┌───────────▼───────────────────────────┐  │
│  │  Document Agent Tools (new)           │  │
│  │  - get_document_readiness_summary     │  │
│  │  - get_document_status_breakdown      │  │
│  │  - get_document_numbering_config      │  │
│  │  - get_document_gaps_analysis         │  │
│  │  - get_dms_table_info                 │  │
│  │  - search_documents_in_dms            │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  Existing PSSR/ORA/ORM Tools          │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## What Gets Built

### 1. Document Agent System Prompt (added to `ai-chat/index.ts`)

Add DMS domain knowledge to Bob's system prompt:
- Complete DMS table schema (dms_document_types, dms_disciplines, dms_originators, dms_plants, dms_sites, dms_units, dms_status_codes, dms_projects, dms_numbering_segments)
- Document numbering structure explanation (how segments combine with separators)
- Status code meanings (IFR, IFC, AFC, RLMU, etc.) and their lifecycle
- DMS platform knowledge (Assai, Documentum, Wrench) with hyperlink patterns
- Readiness analysis logic (what constitutes "ready", gap identification)

### 2. New Document Agent Tools (6 tools in `ai-chat/index.ts`)

**Tool 1: `get_document_readiness_summary`**
- Queries `dms_document_types` + `dms_status_codes` to calculate overall readiness %
- Groups by discipline, tier, RLMU status
- Returns: overall %, breakdown by discipline, AFC vs non-AFC counts, RLMU compliance
- Example output: "Overall readiness: 25%. 45 documents still in IFR, 12 in AFC but not RLMU"

**Tool 2: `get_document_status_breakdown`**
- Queries `dms_document_types` with joined status codes
- Filters by project, discipline, tier
- Returns: status distribution (Draft, IFR, IFC, AFC, RLMU), gap counts
- Highlights documents that should be at a higher status for the project phase

**Tool 3: `get_document_numbering_config`**
- Queries `dms_numbering_segments` to explain the numbering structure
- Returns: ordered segments with labels, source tables, format rules, example assembled number
- Helps users understand how document numbers are constructed

**Tool 4: `get_document_gaps_analysis`**
- Cross-references document types against expected deliverables for a project phase
- Identifies missing documents, overdue status transitions, discipline gaps
- Returns: prioritized list of gaps with severity (critical/warning/info)

**Tool 5: `get_dms_table_info`**
- Queries any DMS reference table (disciplines, originators, plants, sites, units, status codes)
- Returns: code listings with descriptions for context-aware responses
- Supports search/filter within tables

**Tool 6: `get_dms_hyperlink`**
- Generates deep links to documents in external DMS platforms (Assai, Documentum, Wrench)
- Uses document number + DMS type to construct the URL pattern
- Returns: clickable hyperlink for the user to access the document

### 3. System Prompt Enhancements

Add Document Agent persona knowledge to Bob's prompt:
- When users ask about documents, provide readiness insights proactively
- Highlight gaps and suggest actions (e.g., "12 Process documents are still in IFR - these need to progress to IFC before the Define phase gate")
- Connect document readiness to ORA phases and P2A handover requirements
- Provide DMS navigation assistance with hyperlinks

### 4. Agent Routing Logic

Add document-intent detection to the existing message processing:
- Keywords: "document", "DMS", "document readiness", "AFC", "IFR", "RLMU", "numbering", "Assai", "Documentum", "document status", "documentation gap"
- Route to document-specific tools when detected

## Technical Details

### DMS Tables Used

| Table | Purpose |
|-------|---------|
| `dms_document_types` | Master list with code, name, discipline, tier, RLMU, acceptable_status |
| `dms_disciplines` | Discipline reference (code + name) |
| `dms_originators` | Originator organizations |
| `dms_plants` | Plant locations |
| `dms_sites` | Site definitions |
| `dms_units` | Unit definitions |
| `dms_status_codes` | Status lifecycle (IFR, IFC, AFC, etc.) with rev_suffix |
| `dms_projects` | DMS project codes with cabinets |
| `dms_numbering_segments` | Numbering structure config |

### Key Status Code Lifecycle

```text
Draft → IFR (Issued for Review) → IFC (Issued for Construction)
  → AFC (Approved for Construction) → RLMU (Ready for Live/Mech Use)
```

### Readiness Calculation Logic

- "Ready" = document status matches or exceeds `acceptable_status` on `dms_document_types`
- Gap = document exists but status is below acceptable threshold
- Missing = expected document type for the discipline/project not yet created
- RLMU compliance = documents that need RLMU flag set but don't have it

### DMS Hyperlink Patterns

- Assai: `https://{assai-instance}/document/{document_number}`
- Documentum: `https://{documentum-instance}/dctm-webtop/component/...`
- Wrench: `https://{wrench-instance}/wrench/document/{id}`

(Configurable per project - uses DMS_SYSTEMS from DmsConfigurationTab)

### Files Modified

1. **`supabase/functions/ai-chat/index.ts`** - Add Document Agent tools (6 new tools), expand system prompt with DMS knowledge, add document-intent routing
2. **No frontend changes needed** - Reuses existing ORSHChatDialog/Bob chat UI
3. **No database changes needed** - All DMS tables already exist

### Example Interactions

User: "What's the document readiness for DP300?"
Agent: "DP300 Document Readiness: 25%
- 120 documents tracked across 8 disciplines
- 30 in AFC (target status) 
- 45 still in IFR - need to progress to IFC
- 12 in AFC but missing RLMU flag

🔴 Critical gaps:
- Process Engineering: 8 documents still in Draft
- Electrical: 5 documents missing entirely

Would you like me to show the full breakdown by discipline?"

User: "How does our document numbering work?"
Agent: "Your numbering follows this structure:
6529-WGEL-C017-ISGP-U13000-PX-2365-20502-001

- 6529 = Project (Capital Expansion)
- WGEL = Originator
- C017 = Plant
- ISGP = Site (Integrated Gas Plant)
- U13000 = Unit (Utilities)
- PX = Discipline (Process Engineering)
- 2365 = Document Type (Flow Scheme)
- 20502 = Status Code
- 001 = Revision/Sequence"

User: "Show me the AFC documents for Process discipline"
Agent: Queries and returns filtered list with Assai hyperlinks.

