

## Fix: Three Regressions — Vendor Misclassification, Duplicate Pills, Chat Header Boldness

### Issue 1: Non-vendor documents shown as "vendor documents"

**Root cause**: When the user says "vendor documents", the analytical fallback searches broadly with just `document_number_pattern: projectPattern` (e.g., `6529-%`). This returns ALL project documents — engineering drawings (B01), inspection plans (5733), NCRs (6918), BODs (7704) — not just vendor documents. The code then labels everything as "vendor" because `isFallbackVendorQuery` is true.

**Vendor documents are identified by discipline code `ZV`** (segment 6 of the document number), not by the word "vendor" in the user's query. True vendor doc types have 3-character codes (C08, B01, A01, etc.) with ZV discipline.

**Fix** (in `supabase/functions/ai-chat/index.ts`):
- When `isFallbackVendorQuery` is true, add a `discipline_filter: 'ZV'` to the Assai search call, OR post-filter the returned documents to only include those whose document number contains `-ZV-` in the discipline segment.
- Apply this in both analytical fallback paths (the resolved-type path ~line 9824 and the broad-search path ~line 9986).
- For the type_table, filter to only show document types that appear in ZV-discipline documents.

### Issue 2: Duplicate follow-up action pills

**Root cause**: The structured JSON contains BOTH `followup` and `follow_ups` arrays (line 10041: `follow_ups: analyticalFollowups, followup: analyticalFollowups`). Two separate renderers consume these:
1. `StructuredResponse.tsx` reads `data.followup` → renders "What would you like me to do next?" pills
2. `ORSHChatDialog.tsx` reads `follow_ups` from `parseStructuredResponse()` → renders "Suggested actions" pills

Same data, rendered twice = duplicate pills.

**Fix** (two changes):
- **Backend** (`index.ts`): Remove the `follow_ups` key from the structured JSON in all analytical fallback paths. Keep only `followup` which is consumed by `StructuredResponse.tsx`.
- **Frontend** (`ORSHChatDialog.tsx`): When a structured response is rendered and it contains `followup` data, skip the outer "Suggested actions" rendering. Add a guard: if `structuredData?.followup?.length > 0`, don't render the outer `followUps` pills (lines 931-946).

### Issue 3: Section headers in Bob's chat lost bold + icons

**Root cause**: The `font-variation-settings: "wght" 400` on `body` (line 324 of `index.css`) applies to all descendants including the h2 elements inside Bob's chat. While `.bob-chat-prose h2` sets `"wght" 800`, the specificity may not override when the h2 also has inline styles competing.

**Fix** (`src/index.css`):
- Add `!important` to `.bob-chat-prose h2` font-variation-settings to ensure it wins over the body cascade.
- Also add `.bob-chat-prose h3` with `"wght" 700`.

**Verify** (`ORSHChatDialog.tsx`): The h2 component already has `font-extrabold` and `style={{ fontWeight: 800 }}`. The section icon normalization (`sectionIcons` map) is already in place. Confirm these are not being stripped — they appear intact at line 978-996. No code change needed here, just the CSS specificity fix.

### Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/ai-chat/index.ts` | Filter vendor queries by ZV discipline; remove `follow_ups` key from structured JSON |
| `src/components/widgets/ORSHChatDialog.tsx` | Guard against duplicate pills when structured response has followup data |
| `src/index.css` | Add `!important` to `.bob-chat-prose h2/h3` font-variation-settings |

### Scope guarantee
- All CSS changes are scoped to `.bob-chat-prose` — no impact on ORSH application pages
- No changes to any page layout, sidebar, or heading styles outside the chat

