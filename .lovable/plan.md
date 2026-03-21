

## Filter Chips Redesign

### Problems Identified
1. **"Tier 1" + count "36" reads as "1 36"** — the numeral in the label clashes with the match count
2. **Group labels (TIER, DISCIPLINE, RLMU) add clutter** — user wants them removed
3. **RLMU should sit next to Tier 2** — remove group-based ordering/separators
4. **Dots inside active chips waste horizontal space** — unnecessary when the tinted background already signals selection
5. **Overall design can be tighter and more modern**

### Design Solution

**Fix the count clash**: Move the match count into a clearly separated badge with a contrasting background (not `bg-current/10` which is too subtle). Use a `·` separator character before the count, or place the count in a distinct pill with slightly darker tint.

**Remove group labels & separators**: Delete the `isFirstInGroup` label rendering and the vertical divider logic entirely. Render all chips as a flat row: Tier 1, Tier 2, RLMU, Elect, Static, Rotating, Inst, Ops, Tech Safety.

**Remove dot from active chips**: Only show the colored dot on inactive chips (restoring `opacity-0` when active). The tinted background + colored text is sufficient active indication.

**Tighter active count badge**: Use a solid semi-transparent background that contrasts with the chip color (e.g., for orange chip: `bg-orange-200/60 dark:bg-orange-800/40`) and render as `(36)` or a distinct pill.

### Changes

**File**: `src/components/admin-tools/dms/DmsDocumentTypesTab.tsx`

1. **Reorder FILTER_CHIPS array**: Tier 1, Tier 2, RLMU, then disciplines — remove `group` property usage
2. **Remove group label rendering** (lines 468-473): Delete the separator divider and uppercase group label spans
3. **Hide dot when active**: Restore `opacity-0` on active state for the dot
4. **Redesign count badge**: Change from `bg-current/10 text-[9px]` to a more visible, separated badge — use chip-specific darker tint background class (e.g., `bg-orange-200 dark:bg-orange-800/50`) and slightly larger text. Add `countBadgeClass` to each chip config.
5. **Simplify chip padding**: Keep `px-2 py-0.5` but reduce inner `gap` to `gap-0.5` since dot is hidden when active

