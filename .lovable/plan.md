

## Plan: Deduplicate Document Type Rows When Discipline Columns Are Hidden

### Problem
When neither `discipline_code` nor `discipline_name` columns are visible, duplicate rows appear (e.g., multiple "4018 — General Arrangement Diagram" entries that only differ by discipline). These duplicates are meaningless without the discipline context.

### Solution
Add a deduplication step between the `filtered` array and the rendered table rows:

**File: `src/components/admin-tools/dms/DmsDocumentTypesTab.tsx`**

After the `filtered` constant (~line 120), add logic that checks whether `discipline_code` or `discipline_name` columns are currently visible. If neither is visible, deduplicate `filtered` by `code + document_name`, keeping only the first occurrence. If either discipline column is visible, show all rows as-is.

```text
const isDisciplineVisible = columns.some(
  c => (c.id === 'discipline_code' || c.id === 'discipline_name') && c.visible
);

const displayRows = isDisciplineVisible
  ? filtered
  : filtered.filter((item, index, arr) =>
      arr.findIndex(d => d.code === item.code && d.document_name === item.document_name) === index
    );
```

Then replace all references to `filtered` in the JSX (the `.map()` and empty-state check) with `displayRows`.

### Scope
- Single file edit: `DmsDocumentTypesTab.tsx`
- ~5 lines added, ~2 lines changed

