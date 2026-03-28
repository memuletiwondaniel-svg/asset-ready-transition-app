

## Phase 2: Fix 5 Bugs — Revised Plan

### Bug 1 — read_assai_document: Dynamic project resolution (REVISED)

**Root cause confirmed**: `read_assai_document` hardcodes `proj_seq_nr: '59734'` and `selected_project_codes: 'BGC_PROJ'` (line 6696-6699). This means documents from project 6523 (DP223) return zero results, causing the "technical issue" error.

**Fix** (`supabase/functions/ai-chat/index.ts`):
- Extract the project code from the document number's first segment (e.g., `6523` from `6523-EXTR-C008-...`)
- Query `dms_projects` table to resolve the project code to its `proj_seq_nr` and `project_cabinet` (same pattern the search tool already uses)
- Use the resolved values in the search POST instead of hardcoded `59734`/`BGC_PROJ`
- Fall back to `59734`/`BGC_PROJ` only if the lookup fails (maintains backward compatibility)
- Also add robust error handling: if `pkSeqNr`/`enttSeqNr` are empty strings, log the full row structure and return a clear error

### Bug 2 — Vendor misclassification

No changes from previous plan. Add VENDOR DOCUMENT IDENTIFICATION section to both Bob and Selma prompts. Ensure ZV discipline filter and reject 4-digit numeric type codes.

### Bug 3 — Duplicate follow-up pill sections

No changes from previous plan. Standardize on `followup` key, remove `follow_ups`, standardize label to "What would you like to do next?", guard outer pills when structured data has followups.

### Bug 4 — Section header styling

No changes from previous plan. Add icons (📊📁📄✨) and bold styling to section headers in `StructuredResponse.tsx` only.

### Bug 5 — Erratic pills + click behaviour (REVISED — confirming both layers)

**5a — Pill content filtering**: Same as before — add metadata prefix filters, reset `ASSAI_DOC_NUMBER_REGEX.lastIndex`, reject doc number fragments, cap at 5 pills.

**5b — Click handler confirmation**: Both layers are already covered:
- **Structured response pills** (line 651): `onClick={() => onFollowupClick?.(f)}` sends `f` directly — these are backend-generated human-readable strings like "Read and interpret the Process Basis of Design". The `onFollowupClick` at line 926 calls `handleSend(text)` which submits the text as the chat message. This path is correct.
- **DocActionButtons** (line 59): Already fixed — sends `Read and interpret ${toTitleCase((title || docNumber).split('***')[0].trim())}`. This sends the clean title, not the raw doc number.
- **Regex-extracted pills** (line 1114): `handleSend(item.replace(/\*\*/g, '') + '?')` — these send the raw extracted text. The sanity filter from 5a will reject metadata/doc-number items before they reach this point, so only clean action text survives. Additionally, we will add a cleanup step here: strip any document number patterns from the item text before sending, so if a doc number leaks through the filter, the sent message is still clean.

**Confirmed**: The fix covers both the visual label AND the submitted message text across all three pill rendering paths.

### Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/ai-chat/index.ts` | Bug 1: Dynamic `proj_seq_nr` resolution from `dms_projects`; Bug 2: Vendor prompt rules; Bug 3: Remove `follow_ups` key; Bug 5: Follow-up prompt rules |
| `src/components/widgets/ORSHChatDialog.tsx` | Bug 3: Standardize label; Bug 5a: Enhanced sanity filter + regex lastIndex fix; Bug 5b: Strip doc numbers from sent text |
| `src/components/bob/StructuredResponse.tsx` | Bug 3: Standardize followup interface/label; Bug 4: Bold headers with icons |

### Implementation order
Bug 3 → Bug 5 → Bug 4 → Bug 2 → Bug 1

