

# Kanban Card Visual Distinction & Project ID De-emphasis

## Problem
1. **Cards blend into column backgrounds** — Both use `bg-card` (white/dark surface), making cards indistinguishable from their container.
2. **ProjectIdBadge is too intense** — Saturated gradient badges with white text dominate the card, pulling focus from task titles.

## Design Approach (Linear/Notion-inspired)

**Card distinction strategy**: Give cards a slightly elevated, warm-white surface while making column bodies a neutral muted tone. This is the approach used by Linear, Notion, and Asana — columns are "trays" (muted/grey), cards are "objects" (white, elevated).

**Project ID strategy**: Replace the heavy gradient badge with a subtle, muted text-only label — just the project code in a small monospace font with a soft background pill. This matches how Linear shows project/team labels.

## Changes

### 1. Column body background (TaskKanbanBoard.tsx ~line 504)
- Change column container from `bg-card` to `bg-muted/40` (light grey tray)
- Cards remain `bg-card` (white) — now they visually "float" on the grey surface

### 2. Card styling (TaskKanbanBoard.tsx ~line 197-207)
- Add `bg-card` explicitly (already there, but now contrasts with muted column)
- Bump shadow slightly: `shadow-sm` → `shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]` for a subtle paper feel

### 3. Project ID de-emphasis (TaskKanbanBoard.tsx ~line 221-225)
- Replace `<ProjectIdBadge>` with a simple styled `<span>` using:
  - `text-[10px] font-medium font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded`
- This makes it a soft grey pill with muted text instead of a vibrant gradient badge
- Keeps the project code readable but secondary to the task title

### 4. Column header refinement (TaskKanbanBoard.tsx ~line 506)
- Keep the tinted header backgrounds as-is (they work well for column identity)
- The contrast improvement comes from the body: tinted header → muted body → white cards = clear three-tier hierarchy

## Files Modified
- `src/components/tasks/TaskKanbanBoard.tsx` — column body bg, card project label, minor shadow tweak

