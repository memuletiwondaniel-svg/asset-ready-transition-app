

# Selma Validation Test Suite — Technical Review of Senior Dev Feedback

## My Assessment of Each Gap

### 1. T2.2 — Change BFD to PEFS: **AGREE with nuance**

The senior dev is correct that Claude knows BFD from training data. However, PEFS is already seeded in `dms_document_type_acronyms` (migration `20260328222932` maps PEFS → C01, "Process Engineering Flow Sheets"). This means the test still validates tool usage — if Selma returns "C01" or "Process Engineering Flow Sheets" with the exact BGC notes, it called the tool. If she gives a generic definition, she hallucinated.

**Change**: Update T2.2 query to `"What is a PEFS?"`, assert response contains `C01` or `Process Engineering Flow Sheets` (the exact DB values). This is a stronger test than BFD.

### 2. T2.5 — Log check instruction: **AGREE, but as documentation only**

The edge function cannot programmatically read its own logs. The auto-assert stays as "response received" — the log check is a **manual follow-up step**. Will add a `log_check` field to the test result with the specific instruction.

**Change**: Add log check guidance text to T2.5 details string: "Verify in logs: [Selma] Tool: discover_project_vendors"

### 3. T3.1 — Log check for totalQueryCount: **AGREE, same approach**

Cannot auto-check logs from within the function. Will add diagnostic guidance to the test details on failure.

**Change**: On fail, include specific diagnostic: "Check logs for totalQueryCount — should exceed 12 for full DP164 sweep"

### 4. T4.1 — Pass criteria too weak: **PARTIALLY AGREE**

The senior dev is right that metadata can exceed 200 chars. However, "specific technical content" (scope, equipment, parameters) is extremely hard to auto-assert — these are arbitrary document contents. 

**Compromise**: Increase threshold to 500 chars AND add negative check — response must NOT be purely metadata patterns (title/revision/status only). Add keywords like "scope", "equipment", "design", "specification", "procedure", "drawing" as positive signals. If none present, mark as `manual` rather than `pass`.

### 5. T5.1a — Stronger trigger: **AGREE**

"Please save this: FCD = Flow Control Diagram" is a clearer intent signal. Will also add log check guidance.

**Change**: Update query and add log check note.

### 6. T0.3 — Bob identity check: **AGREE, low effort high value**

Simple addition. Query "Who are you?" to Bob, assert contains "Bob", does not contain "Selma".

**Change**: Add T0.3 as new test, update Tier 0 count from 2 to 3.

### 7. T3.2 timing: **AGREE**

Add 120s timeout to T3.2 (already has `timeout_ms: 120000` in the edge function, but the documentation/test script doesn't mention it).

### 8. Test count: **AGREE — it's 31 now**

After adding T0.3: 3 (Tier 0) + 1 (Tier 1) + 10 (Tier 2, counting T2.3 as 3) + 4 (Tier 3) + 3 (Tier 4) + 3 (Tier 5) + 7 (Tier 6, counting T6.3 as 4) = **31 tests**.

---

## Implementation Changes

### Edge Function (`validate-selma/index.ts`)

| Change | Lines | Detail |
|--------|-------|--------|
| Add T0.3 | After line 180 | New test: `"Who are you?"` → Bob, agent `"bob"`, assert contains "Bob", excludes "Selma" |
| T2.2 query | Line 229 | Change `"What is a BFD?"` → `"What is a PEFS?"` |
| T2.2 assert | Lines 231-236 | Assert contains `"C01"` or `"Process Engineering Flow Sheets"` |
| T2.5 details | Line 300 | Add log check instruction to details string |
| T3.1 fail details | Lines 340-342 | Add totalQueryCount log check guidance on failure |
| T3.2 | Line 353 | Explicit 120s timeout note in details |
| T4.1 assert | Lines 396-401 | Increase to 500 chars + content keyword check, fallback to `manual` |
| T5.1a query | Line 432 | Change to `"Please save this: FCD = Flow Control Diagram"` |
| T5.1a details | Line 436 | Add log check note for learn_acronym |

### Test Script (`index.test.ts`)

| Change | Detail |
|--------|--------|
| Tier 0 count | Update from 2 to 3 |
| Add T0.3 assertion | Check T0.3 exists and passes |

### Test Suite Document

Regenerate `Selma_Validation_Test_Suite_v2.md` with all 31 tests, corrected counts, and the updated queries/assertions.

