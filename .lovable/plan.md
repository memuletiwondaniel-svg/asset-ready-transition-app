

# SDR Completeness Engine

## What It Does

Mirrors the MDR Completeness Engine but for **Supplier Document Registers (A01)** — one per vendor per project. Selma will parse SDR documents, store expected vendor deliverables, compare against live Assai data (in the **SUP_DOC** module), and report gaps per vendor/PO.

Key differences from MDR:
- SDR type code is **A01** (not 6611)
- SDRs live in the **SUP_DOC** module (not DES_DOC)
- Multiple SDRs per project (one per vendor/PO)
- Vendor-specific columns: **Supplier Document Number**, **SDRL Code**, **Planned Submission Date**
- Document numbers use **ZV** discipline and **3-char alphanumeric** type codes
- Sequence segment = last 5 digits of the **PO number**
- Focus on **document status** (not review codes)

## Architecture

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  SDR Document   │     │  sdr_register     │     │  Assai Live     │
│  (A01 in Assai) │────▶│  (parsed rows)    │◀───▶│  SUP_DOC module │
│  Per vendor/PO  │     │  expected vendor   │     │  (actual state)  │
└─────────────────┘     │  deliverables     │     └─────────────────┘
                        └──────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │ sdr_completeness │
                        │ _snapshots       │
                        │ (per-vendor gaps) │
                        └──────────────────┘
```

## Step 1: Database — `sdr_register` Table

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | Row ID |
| project_id | UUID FK → projects | Which project |
| document_number | VARCHAR | Expected Wood/BGC document number |
| title | VARCHAR | Document title |
| supplier_document_number | VARCHAR | Vendor's own doc number (e.g., BG-231015-SAD-001) |
| sdrl_code | VARCHAR | SDRL code (e.g., A01, B01, C05, J01) |
| discipline_code | VARCHAR | Always ZV for vendor docs |
| document_type_code | VARCHAR | 3-char alphanumeric (A01, B01, C05, etc.) |
| unit_code | VARCHAR | e.g., U40300 |
| originator_code | VARCHAR | e.g., WGEL |
| vendor_code | VARCHAR | Vendor/supplier identifier |
| po_number | VARCHAR | Purchase Order number (extracted from seq segment) |
| planned_submission_date | DATE | When vendor should submit |
| current_status | VARCHAR | Last known status from Assai |
| current_revision | VARCHAR | Last known revision from Assai |
| is_found_in_dms | BOOLEAN | Whether document exists in Assai |
| last_checked_at | TIMESTAMPTZ | When last compared against Assai |
| sdr_source_doc | VARCHAR | The A01 document number this came from |
| tenant_id | UUID | Tenant isolation |

## Step 2: Database — `sdr_completeness_snapshots` Table

Same structure as `mdr_completeness_snapshots` but with additional vendor-level breakdown:

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | Snapshot ID |
| project_id | UUID FK | Project |
| vendor_code | VARCHAR | Which vendor this snapshot covers (or NULL for project-wide) |
| po_number | VARCHAR | PO number (or NULL for project-wide) |
| snapshot_date | DATE | When taken |
| total_expected / total_found | INT | Counts |
| total_at_required_status | INT | Docs meeting their status requirement |
| overdue_count | INT | Docs past planned_submission_date but not found |
| gap_summary | JSONB | Breakdown by SDRL code, status |
| tenant_id | UUID | Tenant isolation |

## Step 3: Edge Function — `parse-sdr`

Mirrors `parse-mdr` but:
1. Searches in **SUP_DOC** module (not DES_DOC) for A01 documents
2. Extracts vendor document numbers alongside Wood/BGC document numbers
3. Parses SDRL codes and planned submission dates from the SDR
4. Extracts PO number from the sequence segment (last 5 digits)
5. Upserts into `sdr_register`

## Step 4: Edge Function — `check-sdr-completeness`

Mirrors `check-mdr-completeness` but:
1. Queries `sdr_register` (filterable by vendor_code or po_number)
2. Searches **SUP_DOC** module in Assai for vendor documents
3. Compares `current_status` against expected status
4. Flags **overdue** documents (past `planned_submission_date` but not found/not at required status)
5. Creates per-vendor snapshots in `sdr_completeness_snapshots`

## Step 5: Selma Tools in `ai-chat/index.ts`

Add two new tools to the `document_agent`:

- **`parse_sdr_document`** — "Parse and ingest a Supplier Document Register (A01) from Assai. Downloads the SDR, extracts expected vendor deliverables, and stores them in the sdr_register."
  - Params: `document_number`, `project_id`

- **`check_sdr_completeness`** — "Check vendor document completeness against a Supplier Document Register. Returns gap analysis with missing vendor documents, overdue submissions, and per-vendor status."
  - Params: `project_code`, `vendor_code` (optional), `po_number` (optional)

Add `'sdr'`, `'vendor'`, `'supplier'` to the document_agent domains for routing.

## Files Modified

| File | Change |
|------|--------|
| New migration | Create `sdr_register` and `sdr_completeness_snapshots` tables with RLS |
| `supabase/functions/parse-sdr/index.ts` | New edge function — download A01 from SUP_DOC module, parse vendor deliverables |
| `supabase/functions/check-sdr-completeness/index.ts` | New edge function — compare SDR vs Assai SUP_DOC, produce vendor gap report |
| `supabase/functions/ai-chat/index.ts` | Add `parse_sdr_document` and `check_sdr_completeness` tools + handlers |

## What Selma Can Do After This

- "Parse the SDR for PO 01463" → Ingests the A01 and populates vendor register
- "What's the vendor document status for Specialist Services?" → Per-vendor gap report
- "Show overdue vendor submissions for DP300" → Flags documents past planned date
- "Compare MDR vs SDR completeness for DP300" → Combined engineering + vendor view

