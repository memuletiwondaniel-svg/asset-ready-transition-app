

## Filter Chips: Final Polish to Match Top-Tier Enterprise SaaS

### Current Assessment
The implementation already follows 80% of best practices: soft tints, colored dots, group separators, match counts. The remaining gaps are subtle but noticeable in side-by-side comparisons with Linear, Airtable, and Notion.

### Remaining Improvements

**1. Active chip dot should stay visible (not hidden)**
Currently `opacity-0` when active. Linear and Airtable keep the dot visible in both states -- it anchors the color identity. When active, the dot should match the text color or stay as-is.

**2. Active chip needs a subtle checkmark or filled dot instead of hiding it**
Replace the invisible dot with a slightly larger filled dot (2px -> 2.5px) when active, reinforcing selection state beyond just background color.

**3. Match count should use a semi-transparent pill badge**
Instead of inline ` · 42` text, wrap the count in a small `rounded-full bg-current/10 px-1.5` mini-badge. This is the Airtable/Jira pattern -- makes counts scannable at a glance.

**4. Group labels above separators**
Add tiny `text-[10px] uppercase tracking-wider text-muted-foreground` labels ("Tier", "Discipline", "RLMU") above each group for first-time discoverability. Optional but used by Attio.

**5. Transition polish**
Add `duration-150` to the chip transitions and a subtle `shadow-sm` on active chips for depth -- standard in Linear's filter bar.

### Implementation Plan

**Single file**: `src/components/admin-tools/dms/DmsDocumentTypesTab.tsx`

1. **Keep dot visible when active** -- Remove `isActive ? "opacity-0"` logic, instead show the dot always with appropriate color
2. **Wrap match count in mini-badge** -- `<span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-current/10 text-[10px]">{count}</span>`
3. **Add shadow to active chips** -- Append `shadow-sm` to each `activeClass`
4. **Add group labels** -- Insert small uppercase text labels before the first chip of each group
5. **Smooth transitions** -- Ensure `duration-150` is on the chip `transition-all`

No new files. No structural changes. Purely visual refinement.

