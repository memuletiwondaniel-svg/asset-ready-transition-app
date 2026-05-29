# Projects table — round 3 refinements

## 1. Header row — less dull, more structured

Current: flat `bg-muted/40` band, tiny uppercase muted text. Reads as a tinted strip, not a real header.

Change:
- Swap to a subtle two-tone treatment: `bg-gradient-to-b from-muted/60 to-muted/30`, `border-b border-border` (full strength, not `/60`).
- Header text to `text-[11px] font-semibold text-foreground/70` (was `font-medium text-muted-foreground/80`). Keep uppercase + `tracking-[0.08em]`.
- Sort chevrons inherit the stronger color, so active sort reads cleanly.
- Slightly taller: `py-3.5` (was `py-3`) so the header has presence without dominating.

No new colors, no accent stripe — keeps it neutral but no longer washed out.

## 2. ID as a pill

Reverse the last round. Bring back a chip, but lighter than v1:
- `inline-flex items-center px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15 font-mono text-[11px] font-semibold tabular-nums tracking-tight`
- Pill shape (`rounded-full`) signals "identifier" the way badges in Linear / Height do.
- Primary tint gives it recall value without the random per-row colors we killed earlier.

## 3. Scope clamp: 3 → 2 lines

`ScopeText`: `line-clamp-3` → `line-clamp-2`. "Show more" logic unchanged.

## 4. Column widths

Tighten everything that isn't Title or Progress; give the reclaimed space to Title.

| Column | Now | New |
|---|---|---|
| ID | 76 | 72 |
| Title | 340 | **440** |
| Milestone | 208 | 180 |
| Location | 160 | 120 |
| Qualifications | 128 | 110 |
| P2A Progress | 180 | **200** |

Bump `PROJECTS_TABLE_PREFS_KEY` to `p2a-projects-v5` so saved widths don't override.

## 5. Qualifications — left-justify under header

Header for `qualifications` currently has `align: 'right'`. Remove `align: 'right'` from the column def (header naturally left-aligns) and change the body cell from `flex justify-end pr-4` → `flex justify-start`. The number chip now sits flush-left under the "Qualifications" label. Sort chevron also moves to the left side, matching other columns.

## 6. P2A Progress — bar redesign, not doughnut

**Recommendation: keep the bar, refine it. Skip doughnut.**

Why not doughnut:
- Doughnuts at 16–20px diameter are hard to read at a glance; you lose the "where on the journey" sense a linear bar gives.
- Doughnuts don't sort visually — your eye can't scan a column of rings and see "85, 56, 0" the way it scans bar lengths.
- They eat more horizontal room per unit of information than a thin bar + %.
- Bars are the standard for *progress* (linear, time-bounded); doughnuts are for *composition*.

Refined bar (Linear / Vercel style):
- Thicker, rounder track: `h-2 rounded-full bg-muted` (was `h-1.5`).
- Indicator: same `rounded-full`, but tone shifts to a single calmer palette — `bg-emerald-500` at 100, `bg-primary` for in-progress (drop the amber/rose mid-tier — too alarmist for a neutral progress signal), `bg-muted-foreground/20` at 0.
- Percentage label: `text-[13px] font-semibold tabular-nums`, sits to the right with `w-11` slot.
- Add a tiny `0` → `100` track tick illusion via inner `shadow-[inset_0_0_0_1px_hsl(var(--border))]` so the empty state still shows a defined track.
- Subtle hover: bar grows to `h-2.5` on row hover (transition) — gives interaction feedback without being noisy.

If you specifically want to *try* a doughnut variant before deciding, say the word and I'll generate two design directions side-by-side (refined bar vs. ring) so you can pick visually.

## Files

- `src/components/project/ProjectsTable.tsx` — header styling, ID pill, scope clamp, column widths + `align` removal, qualifications cell justify, progress bar refresh, prefs key bump to `v5`.

No other files touched. No data / hook / business logic changes.
