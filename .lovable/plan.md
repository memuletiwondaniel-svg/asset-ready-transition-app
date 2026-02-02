
Goal
- Make the “Add Systems” button always visible in the Systems Panel, and vertically aligned with the “Add VCR” control row (the bottom fixed “Unassigned VCRs” area in the main workspace).
- Ensure the button stays fixed even while scrolling inside the Systems Panel.

What’s happening now (based on code)
- The main workspace already has a fixed bottom bar for Unassigned VCRs: `PhasesTimeline.tsx` uses `div.flex-shrink-0.h-[180px] ...` (this is the “row” where “Add VCR” lives).
- The SystemsPanel currently has its own footer (`div.shrink-0 p-3 ...`) that should be visible, but users still can’t see it—likely due to layout constraints/clipping:
  - SystemsPanel has `h-full` + `overflow-hidden` + extra `ml-4` and `border-l` (which is also inconsistent with “LEFT Side” placement).
  - The parent flex containers may not be giving consistent `min-h-0`/stretching, which can cause bottom content to be clipped in nested flex + overflow contexts.

Implementation approach
A) Make SystemsPanel use the same “bottom row” concept as the PhasesTimeline
1. Change the SystemsPanel layout from:
   - Header
   - ScrollArea (flex-1)
   - Small footer (auto height)
   to:
   - Header
   - ScrollArea (flex-1, min-h-0)
   - Fixed bottom footer with the same height as the Unassigned VCR bar: `h-[180px] flex-shrink-0`
2. Place the “Add Systems” button inside that fixed-height footer.
3. Optional (recommended): also add a small “Systems actions” header line inside that footer (or keep it minimal) so the footer doesn’t look like “blank space” if the button is the only element.

B) Fix container sizing so the footer cannot be clipped
4. Update SystemsPanel root container classes to remove layout anomalies and improve predictability:
   - Remove `ml-4` (unnecessary offset that can create unexpected clipping/spacing).
   - Replace `border-l` with `border-r` because the panel sits on the left; the divider should be on the right edge between panel and workspace.
   - Replace `h-full` with `min-h-0` and ensure it can stretch correctly in the flex parent.
   - Keep `overflow-hidden` on the panel container so only the internal ScrollArea scrolls.
5. Ensure the immediate flex row that contains `SystemsPanel` + `PhasesTimeline` uses `min-h-0` so children can correctly compute heights under `overflow-hidden` parents.
   - In `P2AHandoverWorkspace.tsx`, update the “Main Content Area” wrapper from `flex-1 flex overflow-hidden` to `flex-1 flex overflow-hidden min-h-0`.
   - This is a common fix when a nested child uses `ScrollArea` + fixed footer and content ends up clipped.

C) Match the “row” styling with Unassigned VCRs (visual alignment)
6. Make the SystemsPanel footer visually consistent with the Unassigned VCRs bar:
   - Use similar background and border: `border-t border-border bg-muted/30`
   - Similar padding: `px-4 py-2`
7. Match button sizing and style to “Add VCR”:
   - Use `size="sm"`, `className="h-7 px-2 ..."` to match the “Add VCR” chip-like button so they feel like the same row of actions.

Files to change
1) src/components/p2a-workspace/systems/SystemsPanel.tsx
- Adjust the main container classes:
  - From: `className="w-48 h-full border-l border-border bg-card flex flex-col ml-4 overflow-hidden"`
  - To something like: `className="w-48 flex flex-col border-r border-border bg-card overflow-hidden min-h-0 flex-shrink-0"`
- Keep header as-is.
- Keep `ScrollArea` as `className="flex-1 min-h-0 overflow-hidden"`.
- Replace the current footer with a fixed-height footer:
  - `div className="flex-shrink-0 h-[180px] px-4 py-2 border-t border-border bg-muted/30"`
  - Put “Add Systems” button inside, matching “Add VCR” sizing (`h-7 px-2`, etc.).

2) src/components/p2a-workspace/P2AHandoverWorkspace.tsx
- Update the wrapper around SystemsPanel + PhasesTimeline to include `min-h-0`:
  - From: `<div className="flex-1 flex overflow-hidden">`
  - To: `<div className="flex-1 flex overflow-hidden min-h-0">`

How we’ll verify (manual test checklist)
- Open the P2A Handover Plan Overlay.
- Confirm “Add Systems” is visible immediately (no scrolling required).
- Scroll inside the Systems Panel list: the “Add Systems” button must remain visible and fixed at the bottom.
- Confirm the bottom of the Systems Panel aligns with the Unassigned VCR bar (the row containing “Add VCR”).
- Test on smaller screens (reduced viewport height) to ensure the footer still appears and the systems list scrolls instead of pushing/clipping the footer.

Edge cases / considerations
- If the user expects “Add Systems” to literally be next to “Add VCR” in the same horizontal row across the entire overlay (single shared bottom action bar), that would require a structural refactor: moving both buttons into a shared parent “bottom bar” outside both panels. The plan above achieves the typical interpretation: aligned rows within their respective panels, fixed and visible.
- We’ll keep pointer-events and DnD unaffected; the footer will not be droppable unless explicitly needed later.

Expected outcome
- “Add Systems” will be permanently visible (fixed footer).
- The Systems Panel will feel visually aligned with the workspace bottom “Unassigned VCRs” row.
- Scrolling will only happen in the SystemsPanel ScrollArea, not on the entire overlay.
