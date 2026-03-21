

## UI/UX Assessment: Filter Chips vs. Enterprise SaaS Standards

### Current State
The filter chips use solid filled backgrounds (orange, blue, yellow, teal, etc.) when active, and muted pill buttons when inactive. This is **functional but not aligned with modern enterprise SaaS patterns** used by apps like Linear, Notion, Attio, or Airtable.

### Issues

1. **Saturated solid fills are visually heavy** — When multiple chips are active, the row becomes a rainbow of bold colors competing for attention. Enterprise tools use softer tints (light background + colored text/border) to keep the interface calm.

2. **No active count indicators** — Chips don't show how many records match, which is standard in tools like Airtable and Jira for quick data awareness.

3. **Inactive chips lack personality** — All inactive chips look identical gray. Better to hint at each chip's color even in the inactive state (subtle tinted border or dot) so users build color-category associations.

4. **No grouped visual separation** — Tier, Discipline, and RLMU are conceptually different filter groups but rendered as a flat list. Enterprise tools group related filters or use subtle separators.

### Recommended Design

**Active state**: Light tinted background + colored text + colored border (e.g., `bg-orange-100 text-orange-700 border-orange-300` for Tier 1) — softer, scannable, professional.

**Inactive state**: Add a small colored dot indicator before the label so each chip hints at its category color even when off.

**Group separators**: Add thin vertical dividers between Tier group, Discipline group, and RLMU.

**Match count badges**: Show record count inside each chip when active (e.g., "Tier 1 · 42").

### Implementation Plan

**Single file**: `src/components/admin-tools/dms/DmsDocumentTypesTab.tsx`

1. **Update FILTER_CHIPS config** — Replace `activeClass` with `activeClass` (tinted) and add `dotColor` and `group` properties:
   - Tier 1: `bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700`, dot: `bg-orange-500`
   - Tier 2: `bg-blue-100 text-blue-700 border-blue-300`, dot: `bg-blue-500`
   - Elect: `bg-yellow-100 text-yellow-700 border-yellow-300`, dot: `bg-yellow-500`
   - Static: `bg-teal-100 text-teal-700 border-teal-300`, dot: `bg-teal-500`
   - Rotating: `bg-cyan-100 text-cyan-700 border-cyan-300`, dot: `bg-cyan-500`
   - Inst: `bg-purple-100 text-purple-700 border-purple-300`, dot: `bg-purple-500`
   - Ops: `bg-emerald-100 text-emerald-700 border-emerald-300`, dot: `bg-emerald-500`
   - Tech Safety: `bg-rose-100 text-rose-700 border-rose-300`, dot: `bg-rose-500`
   - RLMU: `bg-amber-100 text-amber-700 border-amber-300`, dot: `bg-amber-600`

2. **Add colored dot to inactive chips** — Small 6px circle before label text using the `dotColor` class.

3. **Add group separators** — Insert a thin `h-4 w-px bg-border` divider between Tier chips, Discipline chips, and RLMU chip.

4. **Add match count** — When a chip is active, compute and append ` · {count}` to the label using the existing `filtered` data and the chip's `match` function.

5. **Refine inactive hover** — Use `hover:bg-muted` with a subtle border color hint matching the chip's category.

