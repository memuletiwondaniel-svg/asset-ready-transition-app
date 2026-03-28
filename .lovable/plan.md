

## Fix: Analytical Intent Detection in Deterministic Fallback

### Problem

The screenshot shows "How many vendor documents are pending review in DP300?" — an analytical query. Bob responded: "I didn't find a specific document for **MANY**, but found 75 documents. Showing the closest 10:" with a raw table. Two bugs:

1. **"MANY" treated as subject keyword**: `STOP_WORDS_SHARED` (line 9578) doesn't include common analytical words like `MANY`, `PENDING`, `REVIEW`, `STATUS`, `VENDOR`, `COUNT`, `TOTAL`, `NUMBER`. So "MANY" passes through the filter and becomes the `p1SubjectLabel`, producing the nonsensical message.

2. **No analytical intent handling in deterministic fallback**: The intent classification (RETRIEVAL vs ANALYTICAL vs CONTENT) exists only in the LLM prompt (line 9454-9463). When the LLM fails (429 rate limit) and the deterministic fallback runs, it always produces a raw document table — it has no concept of analytical queries. For "how many pending review", the correct response is a status summary grouped by status, not a table of documents.

### Solution

**File**: `supabase/functions/ai-chat/index.ts`

#### Change 1: Expand stop words (line 9578)

Add analytical/quantitative words that should never be treated as document subject keywords:

```
MANY, PENDING, REVIEW, STATUS, VENDOR, COUNT, TOTAL, NUMBER, SUBMITTED, 
APPROVED, REJECTED, BEHIND, AHEAD, PROGRESS, OVERDUE, OUTSTANDING, LATE
```

#### Change 2: Add analytical intent detection in deterministic fallback (~line 10020)

Before the `isSpecificQuery` fork, detect analytical intent from the user message:

```typescript
// Detect analytical intent
const analyticalPatterns = [
  /how many/i, /what('s| is) the status/i, /status of/i, 
  /pending review/i, /pending approval/i, /are (pending|outstanding|overdue)/i,
  /which (contractors?|vendors?|companies?) are/i, /breakdown/i, /summary of/i,
  /distribution/i, /count of/i, /total (number|count)/i
];
const isAnalytical = analyticalPatterns.some(p => p.test(lastUserMessage?.content || ''));
```

#### Change 3: Build analytical response when `isAnalytical` is true (~line 10132)

When `isAnalytical` is true, instead of building a `document_list`, build a `document_search` response with a synthesized summary:

```typescript
if (isAnalytical) {
  // Group by status for "pending review" type queries
  const statusSummary = effectiveSearchResult.status_summary || {};
  const pendingStatuses = ['IFR', 'IFA', 'IFI', 'IFB', 'IFT'];
  const pendingCount = pendingStatuses.reduce((sum, s) => sum + (statusSummary[s] || 0), 0);
  const approvedCount = ['AFU', 'AFC', 'AFD'].reduce((sum, s) => sum + (statusSummary[s] || 0), 0);
  
  // Build concise analytical summary
  let analyticalSummary = `Found **${totalFound}** documents for this project.`;
  if (pendingCount > 0) analyticalSummary += ` **${pendingCount}** are pending review.`;
  if (approvedCount > 0) analyticalSummary += ` **${approvedCount}** are approved.`;
  
  // Use document_search type with status_table for the breakdown
  const structured = {
    type: "document_search",
    summary: analyticalSummary,
    status_table: statusTable,
    type_table: typeTable.slice(0, 5),
    documents: filteredDocList.slice(0, 5), // Show only top 5 as supporting evidence
    highlights: smartInsights,
    follow_ups: ["Show all pending review documents", "Break down by discipline", "Show vendor submission timeline"]
  };
}
```

This produces a summary answer ("75 documents, 42 pending review, 20 approved") with a status breakdown table instead of a raw document dump.

#### Change 4: Vendor grouping for vendor-specific analytical queries

When the query mentions "vendor" and is analytical, group documents by `company_code` (originator segment) and present a ranked summary:

```typescript
if (isAnalytical && /vendor|contractor|supplier|company/i.test(userMsg)) {
  const byCompany: Record<string, { count: number; statuses: Record<string, number> }> = {};
  for (const doc of docList) {
    const company = doc.company_code || 'Unknown';
    if (!byCompany[company]) byCompany[company] = { count: 0, statuses: {} };
    byCompany[company].count++;
    byCompany[company].statuses[doc.status] = (byCompany[company].statuses[doc.status] || 0) + 1;
  }
  // Include vendor_table in structured response
}
```

### Technical Details

- Single file: `supabase/functions/ai-chat/index.ts`
- 4 changes: stop words expansion, analytical detection, analytical response builder, vendor grouping
- The `document_search` structured response type already renders status tables in the UI — no frontend changes needed

