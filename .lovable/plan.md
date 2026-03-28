

## Plan: Add Document Action Buttons to Follow-up Section

### What's changing

The "What would you like me to do next?" section currently shows text-only pill buttons (e.g., "Read and summarise the most relevant HVAC document"). These should be replaced/augmented with the 3 standard document action buttons — **Read & Analyse**, **Download**, **Open in Assai** — when results contain documents. The existing row-level hover actions stay as-is; these new ones appear prominently in the follow-up area so users always see them.

### Implementation

**File: `src/components/bob/StructuredResponse.tsx`**

1. **Add a "Quick Actions" row** above the text follow-ups in all 3 response types (document_analysis, document_list, document_search). When `data.documents` exists and has results, render the top document's 3 action buttons as visible, labeled buttons (not hover-only icons):
   - `BookOpen` — "Read & Analyse" → triggers `onFollowupClick("Read and summarise [title]")`
   - `Download` — "Download" → links to `assaiDownloadUrl(docNumber)`
   - `ExternalLink` — "Open in Assai" → links to `assaiDetailsUrl(docNumber)`

2. If there are multiple relevant documents (e.g., 2-3 HVAC matches), show the actions for the **first/most relevant** document, with a label like "For: [document title]".

3. Keep the existing text pill follow-ups below for contextual suggestions (e.g., "Show IOMs for other units").

4. Style the action buttons as outlined chips with icons — same rounded-full style as follow-up pills but with a left-aligned icon, slightly more prominent (border-primary/40).

**File: `supabase/functions/ai-chat/index.ts`**

No backend changes needed — the document data is already in the structured response. The frontend just needs to read `data.documents[0]` to render the actions.

### Technical detail

Create a reusable `DocumentQuickActions` component:

```tsx
function DocumentQuickActions({ doc, onRead }: { doc: DocumentRow; onRead?: (q: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => onRead?.(`Read and summarise ${doc.title}`)} className="...chip styles...">
        <BookOpen className="h-3.5 w-3.5" /> Read & Analyse
      </button>
      <a href={assaiDownloadUrl(doc.document_number)} target="_blank" className="...chip styles...">
        <Download className="h-3.5 w-3.5" /> Download
      </a>
      <a href={assaiDetailsUrl(doc.document_number)} target="_blank" className="...chip styles...">
        <ExternalLink className="h-3.5 w-3.5" /> Open in Assai
      </a>
    </div>
  );
}
```

Render it in each follow-up section (lines 323-342, 413-432, 572-591) above the existing text pills, gated by `data.documents?.length > 0`. The reference document is `data.documents[0]`.

