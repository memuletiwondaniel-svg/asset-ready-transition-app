

# Fix: Duplicate Text and Non-Clickable Pills

## Two Issues Identified

### Issue 1: Duplicate Text
The prompt has overlapping instructions causing the LLM to state the count twice:
- **Section A** ("LEAD WITH THE ANSWER"): "start with a single natural-language sentence summarising the result" → LLM writes "I found 10 Basis of Design documents..."
- **Section B** ("SUMMARY LINE"): "show a compact one-liner with key counts" → LLM repeats "I found 10 Basis of Design documents..."

Both sections encourage stating counts, so when there's a single document type result, the model generates nearly identical sentences.

**Fix**: Update the prompt to clarify that Section B should NOT repeat the lead sentence. Add: "Do NOT repeat the count or finding from the lead sentence. The summary line should add NEW information (e.g., status breakdown, discipline spread) — not restate what was already said."

### Issue 2: Non-Clickable Pills
The pills visible in the screenshot ("Read main project BfD", "Read Process Design Basis", etc.) are **bold markdown text**, not interactive buttons. The prompt instructs Selma to format follow-ups as `**Bold text** · **Bold text**`, which renders as styled text in markdown — not clickable elements.

The existing follow-up extraction system (3-tier: `<follow_ups>` JSON tag → header regex → colon-header fallback) works well but the LLM isn't using any of those formats. The LLM is embedding pills inline as bold text separated by "·" dots.

**Fix (two-pronged)**:

**a) Prompt change**: Instruct Selma to emit follow-up suggestions using the `<follow_ups>` JSON tag format instead of bold inline text. Replace Section D and the pill instructions in Section F with:

```
D) FOLLOW-UP SUGGESTIONS — after your response, emit actionable follow-ups in this exact format:
<follow_ups>["View by status", "View by discipline", "List top 10 documents"]</follow_ups>
Never use **bold** inline text for follow-ups. Always use the <follow_ups> tag.
```

Update Section F Turn 1 and Turn 3 similarly to use `<follow_ups>` tags.

**b) Fallback extraction**: Add a Tier 4 extraction in `ORSHChatDialog.tsx` that catches bold-text pills separated by "·" or on their own line, converting them to clickable buttons. This catches cases where the LLM ignores the tag format.

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/_shared/selma/prompt.ts` | Fix duplicate text instruction; switch pill format to `<follow_ups>` JSON tags |
| `src/components/widgets/ORSHChatDialog.tsx` | Add Tier 4 bold-pill extraction fallback (~line 1200) |

### Expected Outcome
- No more duplicate "I found X documents" sentences
- Pills like "Read main project BfD" become clickable buttons that send the text as a message when clicked

