

## Revert Suggested Actions & Add "Open in Assai" to Document Card

### What's changing

1. **Remove `DocumentQuickActions` from all follow-up sections** — the "Read & Analyse / Download / Open in Assai" split-button group clutters the suggested actions area. Revert to the clean, clickable chip-only layout that was working before.

2. **Add "Open in Assai" link below the Download link** in the document header card where document details are shown (revision, status, download).

### Implementation — `src/components/bob/StructuredResponse.tsx`

**Remove `DocumentQuickActions` calls** from all 3 follow-up sections:
- Lines 367-371 (document_analysis)
- Lines 462-464 (document_list)
- Lines 624-626 (document_search)

Delete these blocks so follow-ups are just the clickable chip buttons.

**Add "Open in Assai" to document header card** (line ~282):
After the status/revision badges row, add two action links — Download and Open in Assai — styled as small inline links with icons, consistent with the existing document card design:

```tsx
<div className="flex items-center gap-3 mt-2">
  <a href={assaiDownloadUrl(data.document.document_number)}
     target="_blank" rel="noopener noreferrer"
     className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
    <Download className="h-3 w-3" /> Download Link
  </a>
  <a href={assaiDetailsUrl(data.document.document_number)}
     target="_blank" rel="noopener noreferrer"
     className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
    <ExternalLink className="h-3 w-3" /> Open in Assai
  </a>
</div>
```

The `DocumentQuickActions` component itself can stay in the file (or be removed) since it's no longer referenced — but the suggested actions section will return to its original clean, chip-only design.

### Files to modify

| File | Change |
|------|--------|
| `src/components/bob/StructuredResponse.tsx` | Remove `DocumentQuickActions` from 3 follow-up sections; add Download + Open in Assai links to document header card |

