

# MDR Completeness Engine

## What It Does

Selma will be able to parse a Master Document Register (6611), store the expected documents, compare them against live Assai data, and produce gap analysis reports — answering "What's missing? What's late? What's the impact on handover?"

This is the **Check** phase of the PDCA cycle: Plan (MDR) → Do (upload docs) → **Check (Selma identifies gaps)** → Act (team closes gaps).

## Architecture

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  MDR Document   │     │  mdr_register     │     │  Assai Live     │
│  (6611 in Assai)│────▶│  (parsed rows)    │◀───▶│  Documents      │
│  PDF/Excel      │     │  expected docs    │     │  (actual state)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │ mdr_completeness │
                        │ _snapshots       │
                        │ (gap analysis)   │
                        └──────────────────┘
```

## Step 1: Database — `mdr_register` Table

Stores parsed MDR rows (expected documents for a project):

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | Row ID |
| project_id | UUID FK → projects | Which project |
| document_number | VARCHAR | Expected document number |
| title | VARCHAR | Document title from MDR |
| discipline_code | VARCHAR | e.g., JA, EL, IN |
| document_type_code | VARCHAR | e.g., 2365, 0401 |
| unit_code | VARCHAR | e.g., G00000, U41100 |
| originator_code | VARCHAR | e.g., WGEL, ABBE |
| final_rev_requirement | VARCHAR | Expected final status (e.g., IFI, AFU) |
| current_status | VARCHAR | Last known status from Assai (updated by sync) |
| current_revision | VARCHAR | Last known revision from Assai |
| is_found_in_dms | BOOLEAN | Whether document exists in Assai |
| is_tier1 | BOOLEAN | Handover-critical Tier 1 |
| is_tier2 | BOOLEAN | Handover-critical Tier 2 |
| last_checked_at | TIMESTAMPTZ | When last compared against Assai |
| mdr_source_doc | VARCHAR | The 6611 document number this came from |
| tenant_id | UUID | Tenant isolation |

## Step 2: Database — `mdr_completeness_snapshots` Table

Point-in-time completeness reports:

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | Snapshot ID |
| project_id | UUID FK | Project |
| snapshot_date | DATE | When snapshot was taken |
| total_expected | INT | Total MDR rows |
| total_found | INT | Documents found in Assai |
| total_at_final_status | INT | Documents meeting their `final_rev_requirement` |
| tier1_expected / tier1_complete | INT | Tier 1 progress |
| tier2_expected / tier2_complete | INT | Tier 2 progress |
| gap_summary | JSONB | Breakdown by discipline, type, status |
| tenant_id | UUID | Tenant isolation |

## Step 3: Edge Function — `parse-mdr`

A new edge function that:
1. Accepts a 6611 document number
2. Uses `read_assai_document` logic to download the PDF/Excel from Assai
3. Parses the tabular content (extracting document number, title, discipline, type, unit, originator, final rev requirement columns)
4. Upserts rows into `mdr_register`
5. Returns a summary (row count, disciplines found, etc.)

## Step 4: Edge Function — `check-mdr-completeness`

A new edge function that:
1. Takes a project_id
2. Reads all `mdr_register` rows for that project
3. For each expected document, queries Assai (via `search_assai_documents` pattern) to check if it exists and its current status/revision
4. Updates `mdr_register` with `is_found_in_dms`, `current_status`, `current_revision`
5. Compares `current_status` against `final_rev_requirement` to determine maturity
6. Flags Tier 1/2 gaps with impact analysis
7. Creates a snapshot in `mdr_completeness_snapshots`
8. Returns structured gap report

## Step 5: Selma Tool — `check_mdr_completeness`

Add a new tool to Selma's document agent toolset:
- **Name**: `check_mdr_completeness`
- **Description**: "Check document completeness for a project against its Master Document Register (MDR). Returns gap analysis showing missing documents, maturity shortfalls, and Tier 1/2 handover impact."
- **Parameters**: `project_code` (DP number or project code)
- Calls the `check-mdr-completeness` edge function
- Returns structured data for Selma to narrate intelligently

## Step 6: Selma Tool — `parse_mdr_document`

Add a tool for ingesting MDR documents:
- **Name**: `parse_mdr_document`
- **Description**: "Parse and ingest a Master Document Register (6611) from Assai into the completeness tracking system."
- **Parameters**: `document_number` (the 6611 document number)
- Calls the `parse-mdr` edge function

## Files Modified

| File | Change |
|------|--------|
| New migration | Create `mdr_register` and `mdr_completeness_snapshots` tables with RLS |
| `supabase/functions/parse-mdr/index.ts` | New edge function — download and parse 6611 documents |
| `supabase/functions/check-mdr-completeness/index.ts` | New edge function — compare MDR vs Assai, produce gap report |
| `supabase/functions/ai-chat/index.ts` | Add `check_mdr_completeness` and `parse_mdr_document` tools to Selma's document agent |

## What Selma Can Do After This

- "What's the document completeness for DP300?" → Gap report with percentages, missing docs, Tier 1/2 impact
- "Parse the MDR for DP300" → Ingests the 6611 and populates the register
- "Show me all missing Tier 1 documents for DP300" → Filtered gap analysis
- "How has completeness changed over the last month?" → Snapshot comparison

