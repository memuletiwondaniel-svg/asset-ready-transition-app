

## Fix: Follow-up Suggestions Rendering as Plain Text Instead of Clickable Pills

### Root Cause

Two issues combine to break the clickable pills:

1. **AI skips tool calls on repeat queries.** When the user asks about the same document again in the same chat, the AI answers from conversation memory (0 tool calls, confirmed in logs). This means `searchToolResult` is never set, PART 1 never fires, and no `<structured_response>` JSON is generated. The AI returns plain markdown with bullet-point follow-ups.

2. **Client-side follow-up extraction is too narrow.** The frontend (ORSHChatDialog.tsx line 992) has a regex that only matches sections headed by "Would you like me to". But the AI uses other headers like "What would you like to do next?", "Quick Actions", "Next Steps" — none of which match, so bullets stay as plain text.

### Fix 1: Broaden client-side follow-up pill extraction (ORSHChatDialog.tsx)

Expand the regex on line 992 to catch all common follow-up section patterns:

**Current:**
```regex
/## [emoji]+ Would you like me to[\s\S]*?(?=\n## |\n---|\s*$)/i
```

**New:** Match any section header containing "would you like", "next steps", "quick actions", "what would you like", "suggested actions", "what can I do", or a plain bold header like "**Quick Actions**" / "**Next Steps**":

```regex
/(?:## [^\n]*(?:would you like|next steps?|quick actions?|suggested actions?|what can I|what I can do)[^\n]*|(?:\*\*(?:Quick Actions?|Next Steps?|Suggested Actions?|What would you like)[^\n]*?\*\*))\s*\n([\s\S]*?)(?=\n## |\n---|\n\*\*[A-Z]|\s*$)/i
```

Extract bullet items from the matched block, strip them from the markdown, and render as clickable pills (same as existing code on lines 1027-1042).

### Fix 2: Strengthen mandatory tool execution in system prompt (ai-chat/index.ts)

Add to the system prompt (around line 758, in the DOCUMENT SEARCH RESPONSE FORMAT section):

```
MANDATORY TOOL EXECUTION: You MUST call search_assai_documents for EVERY document-related query, even if you already found the document in a previous turn. NEVER answer document queries from conversation memory alone. The system requires fresh tool results to render the interactive UI (clickable actions, download links, status badges). If you skip the tool call, the user gets a degraded plain-text experience.
```

### Fix 3: Server-side safety net — detect AI skip and force structured response (ai-chat/index.ts)

After the agent loop exits (line 9826), if:
- `searchToolResult` is null (no search tool was called this turn)
- `finalTextContent` contains document numbers matching the Assai pattern (e.g., `6529-`)
- The user's message mentions document-related keywords

Then attempt to extract the document number from the AI's text and build a minimal structured response with the document metadata from conversation context, ensuring follow-ups render as pills.

### Files to modify

| File | Change |
|------|--------|
| `src/components/widgets/ORSHChatDialog.tsx` | Broaden follow-up section detection regex to catch "Quick Actions", "Next Steps", "What would you like to do next", etc. |
| `supabase/functions/ai-chat/index.ts` | Add mandatory tool execution instruction to system prompt. Add server-side fallback to detect document references in AI text and build structured response. |

