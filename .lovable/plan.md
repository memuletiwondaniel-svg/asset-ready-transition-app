
# Training Overlay Repair — Final UI/UX Plan

## Diagnosis from the current code
The current overlay is a custom fixed `<div>` in `AgentTrainingDialog.tsx`, not the shared Radix dialog system. That is why the modal behavior feels off:
- centering is visually unstable against the sticky page header/background
- backdrop is custom and not using the app’s standard modal overlay
- outside click closes, but draft persistence is accidental rather than intentionally designed
- Train/History switching is split between the card and the overlay, so the interaction model feels inconsistent
- the setup view is still too tall and airy for an enterprise-grade training modal
- the history view lives outside the modal while the user expects it to be part of the same focused training workspace

## Superior design direction
Move to a true **focus-mode training workspace**:
- compact launcher on the page
- one centered modal overlay for both Train and History
- darkened backdrop with blur
- click outside / Esc closes the modal
- closing the modal preserves draft/session state
- explicit “New session” resets state only when the user asks for it
- modern segmented Train / History controls with hover + active states
- no irrelevant tabs like activity/performance inside the training modal

## Files to update
1. `src/components/admin-tools/agents/AgentTrainingDialog.tsx`
2. `src/components/admin-tools/agents/AgentTrainingStudio.tsx`

## Change 1 — Rebuild the overlay on top of shared Dialog primitives
Replace the custom fixed wrapper in `AgentTrainingDialog.tsx` with:
- `Dialog`
- `DialogContent`
- `DialogHeader` / custom header region

Use the existing shared dialog behavior from `src/components/ui/dialog.tsx` so the modal:
- opens centered
- gets the standard dark overlay
- traps focus correctly
- supports outside-click close reliably
- feels consistent with the rest of the product

Implementation detail:
- use a wide desktop modal, roughly `sm:max-w-5xl`
- use `h-[85vh]` / `max-h-[85vh]`
- add `overflow-hidden`
- keep rounded corners and strong shadow
- use a darker overlay via `overlayClassName="bg-black/70 backdrop-blur-md"`

## Change 2 — Preserve draft state intentionally on close
Do **not** call `resetChat()` when the modal closes from:
- outside click
- Esc
- close button

Keep current in-memory state alive:
- `input`
- `docName`
- `docLink`
- `uploadMode`
- `attachedFiles`
- `messages`
- `subState`
- `sessionId`

Only reset when the user explicitly chooses:
- “New session”
- session completion flow that intentionally finalizes and returns to history

This gives the resume behavior the user requested.

## Change 3 — Move Train and History into the modal header
Unify the experience:
- the page card remains a compact preview/entry point
- once opened, the modal contains the real workspace
- Train and History become segmented controls inside the modal header

Result:
- user can switch between Train and History without leaving the overlay
- the “can’t see train now tab” issue disappears because both modes live in one consistent place
- history is no longer a detached secondary surface

Interaction pattern:
- left side: avatar + modal title/subtitle
- center/right: segmented tabs for `Train` and `History`
- far right: `New session` + close

## Change 4 — Upgrade Train/History tabs to enterprise segmented controls
Replace plain ghost buttons with world-class segmented controls:
- shared pill container `bg-muted/60 border border-border/50 rounded-xl p-1`
- active state: `bg-background shadow-sm text-foreground`
- inactive state: `text-muted-foreground hover:text-foreground hover:bg-background/60`
- smooth motion: `transition-all duration-200`
- subtle hover affordance on both tabs
- icons remain small and consistent

This applies both in the modal and, if retained on the card preview, in the preview controls too.

## Change 5 — Tighten the setup view inside the modal
The setup area should look like a premium workspace, not a sparse empty state:
- reduce excess vertical whitespace
- cap content width to a comfortable reading measure
- smaller hero avatar
- stronger hierarchy:
  - session title input
  - one-line helper text
  - compact source toggle
  - refined upload/link drop zone
- keep the message composer docked at the bottom

Target behavior:
- modal feels centered and dense
- the first usable controls are visible without “dead space”
- user focus goes immediately to naming/uploading/typing

## Change 6 — Make History a modal panel, not a page replacement
Render `TrainingHistoryPanel` inside the same dialog body when `activeTab === 'history'`.
Also:
- keep the panel height constrained inside modal content
- allow internal scrolling
- preserve active draft when switching away from Train
- include a clear CTA in history header: `Resume draft` if there is unfinished work, and `New session` if user wants to start over

## Change 7 — Improve close behavior and affordances
Refine modal close interactions:
- clicking outside closes the modal
- Esc closes the modal
- close button in header closes the modal
- if there is unsaved draft state, do not warn yet unless current UX already has a confirmation pattern; just preserve state and resume on reopen
- reopening from Train should restore exactly where the user left off

## Change 8 — Keep only training-relevant content in the modal
Remove or avoid any modal-local UI that suggests unrelated product domains:
- no activity tabs
- no performance tabs
- no analytics-style extras inside the training overlay

The training workspace should contain only:
- Train
- History
- session controls
- conversation
- attachments
- completion flow

## Implementation notes
### `AgentTrainingStudio.tsx`
- keep the compact card as launcher/status preview
- opening Train should open modal and default to `activeTab = 'chat'`
- opening History should open modal and default to `activeTab = 'history'`
- keep draft state in the parent studio component
- `resetChat()` remains explicit, not tied to close

### `AgentTrainingDialog.tsx`
- convert to shared dialog primitives
- accept `activeTab` and `setActiveTab` as props from the studio
- render either setup/chat or history within the same modal shell
- reuse `TrainingHistoryPanel` here instead of treating history as a separate card-only mode
- ensure body area uses `min-h-0` and internal scroll regions so centering and overflow behave correctly

## What will not change
- training data logic
- session creation logic
- completion logic
- upload/link behavior
- transcript/history data model
- About / Performance sections

## Expected result
After implementation, the training experience will behave like a proper enterprise modal:
- centered on screen
- darkened, focus-driven backdrop
- outside click closes cleanly
- reopening restores draft/session progress
- Train and History are both accessible inside one polished overlay
- hover and active states feel modern and intentional
- no irrelevant tabs or oversized empty layouts
