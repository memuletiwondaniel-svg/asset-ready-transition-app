

# Comprehensive Agent Routing Protocol — Architectural Fix

## The Screenshots Confirm: It Works Now

The 7 screenshots show the complete 3-turn flow executing perfectly:
- **Turn 1**: Search found the DP-223 BfD, presented metadata with Open in Assai + Download links, and clickable pills ("Search for other DP223 design documents?", "Search for DP223 specifications?")
- **Turn 2**: User clicked "Read and analyse this document?" — Selma confirmed and read it
- **Turn 3**: Full analysis with project identity, design capacity, gas composition, product specs, key findings, critical notes, and document completeness — ending with clickable pills and document links

**The read-and-analyze pipeline is architecturally fixed and working.** The server-side gate, cabinet fix, and 100-page truncation are all in place.

---

## The Remaining Vulnerability: Agent Routing

The current routing has a critical gap that can cause Bob to handle specialist queries:

### How Routing Works Today

```text
User message → detectAgentDomainRegex()
  ├── Regex match? → specialist agent (fast path)
  └── No match? → "copilot"
       ├── CONTINUATION_PATTERN? → inherit from history
       └── Not continuation? → classifyIntent (Haiku, 2s timeout)
            ├── confidence ≥ 0.7 → specialist
            └── confidence < 0.7 or timeout → Bob handles it
```

### The 3 Failure Modes

**1. Pill text doesn't match regex**
When the user clicks "Read and analyze this document", the regex Part 6 requires `\b\d{4}-[A-Z]` (a document number pattern). "this document" has no document number → falls through to `copilot`. It's not a short confirmation either ("Read and analyze this document" doesn't match `CONTINUATION_PATTERN`). Haiku classifier may or may not catch it.

**2. History detection is too shallow**
`detectAgentFromHistory` only re-runs the regex on previous *user* messages. It doesn't check whether the *assistant* previously used Selma tools (like `search_assai_documents`). So even though Selma just searched, the system can't tell.

**3. Haiku timeout = Bob**
If the 2-second Haiku classifier times out or returns low confidence, the query defaults to Bob — who doesn't have Selma's tools.

### The Fix: 3-Layer Defence

#### Layer 1: Tool-Aware History Detection (Server-Side)

Upgrade `detectAgentFromHistory` to check assistant messages for tool usage, not just user message regex:

```text
detectAgentFromHistory():
  Walk backward through conversation messages
  For each assistant message:
    If it contains tool_use blocks with Selma tool names → return 'document_agent'
    If it contains tool_use blocks with Fred tool names → return 'pssr_ora_agent'
    If it contains tool_use blocks with Hannah tool names → return 'hannah'
    If it contains tool_use blocks with Ivan tool names → return 'ivan'
  For each user message:
    Run regex (existing behavior)
```

This means "Read and analyze this document" — which follows a Selma search — will correctly inherit `document_agent` because the prior assistant message used `search_assai_documents`.

#### Layer 2: Expanded Continuation Pattern

Add pill-generated phrases to the continuation pattern or create a new `SPECIALIST_CONTINUATION_PATTERN`:

```text
/^(read and analy[sz]e this document|read this document|
   analy[sz]e this document|show me more details|
   search for a different document|view by status|
   view by discipline|list top \d+ documents|
   compare with.*document|extract tag list|
   check revision|try reading again|open document in assai)[\s.!?]*$/i
```

These are the exact pill texts Selma emits. When matched, inherit the agent from history.

#### Layer 3: Tool Guard at Execution Layer

Add a server-side guard that prevents Bob from executing specialist tools. If Bob (copilot) somehow receives a `search_assai_documents` or `read_assai_document` call, the system should:
- Log a routing misfire
- Re-route the entire request to the correct specialist

```text
At tool execution (line ~7372):
  if detectedAgent === 'copilot' AND toolName is a Selma tool:
    log("[ROUTING MISFIRE] Bob attempted Selma tool — re-routing")
    Switch systemPrompt to SELMA_SYSTEM_PROMPT
    Switch tools to SELMA_TOOLS
    Initialize selmaSession
```

This is the "impossible to break" layer — even if Layers 1 and 2 both fail.

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/ai-chat/index.ts` | **Layer 1**: Upgrade `detectAgentFromHistory` to scan assistant tool_use blocks. **Layer 2**: Add `SPECIALIST_CONTINUATION_PATTERN` with pill texts. **Layer 3**: Add tool-guard that re-routes copilot if it tries specialist tools. |

### What This Guarantees

- **Pill clicks** (e.g., "Read and analyze this document") always route to the correct specialist because Layer 2 matches the text and Layer 1 confirms Selma was active
- **Haiku timeouts** are irrelevant — Layers 1 and 2 resolve before Haiku is ever called
- **Misroutes are self-correcting** — Layer 3 catches any remaining edge case at the tool execution boundary
- **Future agents** (Zain, Alex) benefit automatically — just add their tool names to the Layer 1 map

