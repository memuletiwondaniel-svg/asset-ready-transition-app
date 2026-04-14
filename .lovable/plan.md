

# Competency Inline Summary — Visual Polish

## Issues from Screenshot
1. **Competency name too long** — "Completions Management System integration (GoCompletions)" needs renaming in DB
2. **Donut is green** (uses emerald at 71%) — clashes with green progress bars; needs a distinct, modern color
3. **Wide gap** between competency names and progress bars — bars too far right
4. **Progress bar track too faint** — uncompleted portion barely visible
5. **No visual structure** for competency list items — needs subtle left indicators

## Plan

### 1. Rename competency in DB
Run a SQL update to rename "Completions Management System integration (GoCompletions)" → "Completions Management System integration" in `agent_competency_areas`.

### 2. Modernize donut color — use a neutral/blue-purple gradient approach
Change `CompetencyDonut.tsx` to use a **fixed modern indigo/blue tone** (`hsl(230, 70%, 55%)`) instead of inheriting the level's chartColor. This makes the donut visually distinct from the horizontal bars and feels more dashboard-like. The track (background circle) gets a slightly more visible tint.

### 3. Tighten layout in `CompetencyInlineSummary.tsx`
- Reduce progress bar container from `w-32` → `w-24`
- Add left padding/indent to competency names (`pl-3`) with a subtle left dot indicator using a `before:` pseudo-element or a small colored dot `<span>` — a tiny 4px circle in the level's color acts as a status dot, replacing bullet points (cleaner than bullets, conveys meaning)
- Remove `truncate` from names so they wrap naturally (user wants "fully shown")
- Increase track background from `bg-muted/40` → `bg-muted/60` for stronger uncompleted portion

### 4. Update `competencyLevels.ts` donut chartColor
No change needed here — the donut will use its own fixed color independent of level.

## Files Changed
| File | Change |
|------|--------|
| `CompetencyDonut.tsx` | Use fixed indigo stroke color + stronger track |
| `CompetencyInlineSummary.tsx` | Tighten gap, add status dots, unwrap names, stronger track |
| DB migration/exec | Rename the competency |

## No Impact On
- Side menu, drawer, `CompetencyProfilePanel`, responsive layout — none touched

