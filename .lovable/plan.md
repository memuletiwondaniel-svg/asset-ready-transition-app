

## Fix: Follow-up Actions Always Render as Clickable Pills

### Root Cause

Two specific bugs in `ORSHChatDialog.tsx` line 992-999:

1. **Missing header phrase**: The regex doesn't match "What I can try" (the exact header Bob used in the screenshot). It catches "what can I" and "what I can do" but not "what I can try".

2. **Numbered lists ignored**: The bullet extraction regex on line 996 is `[-•*]\s+(.+)` — it only matches unordered bullets. Bob used a numbered list (`1. Search under...`, `2. Search under...`), which is never extracted.

3. **Fragile by design**: Every new AI phrasing breaks the regex. We need a much broader catch-all approach.

### Solution

**File**: `src/components/widgets/ORSHChatDialog.tsx`

#### Change 1: Broaden the header regex massively

Replace the current regex with one that catches any section header containing action-oriented language:

```regex
/(?:## [^\n]*(?:would you like|next steps?|quick actions?|suggested actions?|what (?:can |would |I can |i can )|options?|try next|do next)[^\n]*|(?:\*\*[^\n]*(?:would you like|next steps?|quick actions?|suggested actions?|what (?:can |would |I can |i can )|options?|try next|do next)[^\n]*?\*\*))\s*\n([\s\S]*?)(?=\n## |\n---|\n\*\*[A-Z]|\s*$)/i
```

Key additions: `what I can try`, `options`, `try next`, `do next`, and the bold-header branch now mirrors the same broad patterns.

#### Change 2: Extract both bulleted AND numbered list items

Replace the bullet-only regex on line 996:

```typescript
// Before (only unordered bullets):
const bulletRegex = /[-•*]\s+(.+)/g;

// After (unordered + numbered):
const bulletRegex = /(?:[-•*]|\d+[.)]\s)\s*(.+)/g;
```

This catches `1. item`, `1) item`, `- item`, `• item`, `* item`.

#### Change 3: Strip trailing description after dash

Many items have format `"Search under Electrical (EA) - CP systems are sometimes filed with electrical"`. The pill should show just the action part. Truncate at ` - ` if the text is long:

```typescript
let label = bm[1].replace(/\?$/, '').trim();
// If item has "Action text - explanation", keep only the action
if (label.length > 60) {
  const dashIdx = label.indexOf(' - ');
  if (dashIdx > 10) label = label.substring(0, dashIdx);
}
followUpItems.push(label);
```

### Technical Details

- Single file change: `src/components/widgets/ORSHChatDialog.tsx` (~lines 992-1003)
- No backend changes needed — this is purely a client-side extraction issue
- The broader regex prevents future whack-a-mole by catching any "what/would/can/try/next/options" phrasing in both `##` headers and `**bold**` headers

