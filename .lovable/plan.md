

# Fix T5.2: Route Acronym-Learning to Selma (Not Bob)

## The Problem

The query "Please save this: FCD = Flow Control Diagram" doesn't match any Selma regex pattern, so it falls to `copilot` (Bob). Bob's Hard Routing Rules only catch queries about "finding, retrieving, or searching" documents — not acronym teaching. So Bob answers conversationally and `learn_acronym` is never called.

## Why the Sr Dev's Proposal (Give Bob `learn_acronym`) Is Wrong

You're correct that Bob should **never** handle document intelligence tasks. Adding `learn_acronym` to Bob violates the architectural principle that Bob is a router, not a specialist. If we give Bob document tools, we erode the boundary between agents.

## The Correct Fix (Two Layers)

### Layer 1 — Route acronym-learning queries to Selma via regex

Add a Part 4 block to `detectAgentDomainRegex` in `ai-chat/index.ts`:

```typescript
// Part 4: Acronym-learning intent
if (/(stands?\s+for|=\s*[A-Z]{2,}|means?\s+[A-Z]|acronym|abbreviation|short\s+for)/i.test(lower)) {
  return 'document_agent';
}
```

This catches patterns like "FCD = Flow Control Diagram", "BFD stands for", "this acronym means", etc.

### Layer 2 — Strengthen Bob's Hard Routing Rules as safety net

Update Bob's Hard Routing Rule #1 (line 295-298) to also cover acronym/abbreviation queries:

```
1. Any query about finding, retrieving, or searching for documents, drawings,
   specifications, datasheets, vendor documents, anything in a DMS,
   OR any request to learn, save, or define a document type acronym or abbreviation →
   respond: "That's a question for Selma..."
```

This ensures that even if the regex somehow misses, Bob refuses and redirects rather than answering.

### Layer 3 — Selma's prompt (unchanged from previous proposal)

Add to `prompt.ts`:
```
When a user teaches you a new acronym, abbreviation, or document type shorthand —
call learn_acronym IMMEDIATELY. Do not just acknowledge conversationally.
The tool call is mandatory, not optional.
```

## What NOT to Do

- Do NOT add `learn_acronym` to Bob's tool list — violates agent boundary architecture
- Do NOT add generic words like "save" or "remember" to the regex — too broad

## Files to Change

1. **`supabase/functions/ai-chat/index.ts`** — Add Part 4 regex block after line 3329; update Bob's Hard Routing Rule #1 at line 295
2. **`supabase/functions/_shared/selma/prompt.ts`** — Add mandatory learn_acronym instruction

## Combined with Other Fixes

This replaces Fix 2 Part B from the Sr Dev's proposal. All other fixes (1A-1D, Fix 3, Fix 4) remain unchanged.

