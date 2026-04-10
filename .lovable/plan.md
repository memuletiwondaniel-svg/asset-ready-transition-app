

# Integrated Plan: Setup UX Fixes + Drag-and-Drop Feedback

**File: `src/components/admin-tools/agents/AgentTrainingDialog.tsx`**

All 4 changes are in this single file.

## Change 1 — Hide paperclip during setup, update placeholder

Line 396-404: Wrap the paperclip `<Button>` with `{subState !== 'setup' && (...)}` so it only appears during active/testing states. The setup area already handles file attachment via the drop zone.

Line 410: Update placeholder to be more descriptive during setup:
- Setup: `"What should {agent.name} learn? Describe the context..."`
- Active/testing: `"Continue training {agent.name}..."`

## Change 2 — Session name as hero element

Restructure the setup area (lines 156-253) so the visual hierarchy becomes:

```text
        [Agent avatar — 64px]
        
     Name this session...
     ________________________

  Upload a document or paste a link —
  Fred will ask questions as he reads.

  [ File ]  [ Link ]   [ Drop a file here, or click to browse ]
```

- Move the session name input (line 167-173) to sit directly below the avatar
- Style it as a Notion-style title: `text-xl font-semibold text-center bg-transparent border-none outline-none` with `autoFocus` and a subtle centered underline (`h-px bg-border/30 w-48 mx-auto`)
- Push the welcome subtitle below the session name

## Change 3 — Simplify drop zone and toggle icons

Line 228: Replace `"Drop or browse · PDF, DOCX, XLSX, PNG, JPG"` with `"Drop a file here, or click to browse"`

Lines 187, 199: Remove `<Paperclip>` and `<Link2>` icons from the File/Link toggle buttons — keep as clean text-only pills.

## Change 4 — Full-dialog drag-and-drop overlay

Add `isDragging` state via `useState<boolean>(false)`.

Attach drag event handlers to the main dialog card (line 128, the `w-[960px]` container):
- `onDragEnter` → set `isDragging(true)`, `preventDefault`
- `onDragOver` → `preventDefault` (required for drop to work)
- `onDragLeave` → only set `isDragging(false)` when `e.relatedTarget` is outside the dialog (prevents flicker from child elements)
- `onDrop` → call existing `handleFileDrop(e)`, set `isDragging(false)`

When `isDragging` is true, render an overlay inside the dialog body area:
- Positioned absolutely over the body region (below header, above input bar)
- `bg-primary/5 border-2 border-dashed border-primary/40 rounded-xl`
- Centered `Upload` icon (48px, `text-primary/40`) + "Drop file here" text
- Animate in with `animate-in fade-in duration-150`
- Works in all sub-states (setup, active, testing)

The existing small drop zone in setup mode stays functional for click-to-browse.

## What does NOT change
- All chat logic, state management, session creation
- Active/testing message rendering
- Completion banner, contradiction alert
- All other components and files

