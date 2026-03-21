

## Side Sheet + Row Click + Sortable Columns — All DMS Tabs

### Summary
Convert all 7 DMS admin tabs from centered Dialog modals to right-side Sheet overlays, add row-click-to-open on every table row, and make every column header sortable (ascending/descending toggle with arrow indicator).

### Affected Files (7 tabs)
1. `DmsDocumentTypesTab.tsx` (783 lines — most complex, has secondary disciplines)
2. `DmsPlantsTab.tsx`
3. `DmsProjectsTab.tsx`
4. `DmsOriginatorsTab.tsx`
5. `DmsStatusCodesTab.tsx`
6. `DmsSitesTab.tsx`
7. `DmsUnitsTab.tsx`

### Changes Per Tab

**1. Replace Dialog with Sheet**
- Swap `Dialog`/`DialogContent`/`DialogHeader`/`DialogFooter` imports for `Sheet`/`SheetContent`/`SheetHeader`/`SheetFooter` from `@/components/ui/sheet`
- SheetContent side="right" with width ~`sm:max-w-md` (matching current dialog width)
- Keep all form fields and save/cancel logic identical

**2. Row Click to Open**
- Add `onClick={() => openEditDialog(item)}` and `cursor-pointer` to each `<TableRow>` in the body
- Remove the pencil edit button from the actions column (row click replaces it)
- Keep the delete button visible on hover

**3. Sortable Column Headers**
- Add state: `sortColumn` (string | null) and `sortDirection` ('asc' | 'desc')
- Make each `<TableHead>` clickable: clicking toggles asc → desc → no sort
- Show `ArrowUp`/`ArrowDown` icon (from lucide) next to active sort column header
- Apply `Array.sort()` on the filtered data before rendering, using locale-aware string comparison for text and numeric comparison for numbers/booleans

### Shared Pattern (applied identically to each tab)

```text
// Sort state
const [sortCol, setSortCol] = useState<string | null>(null);
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

// Toggle handler
const toggleSort = (col: string) => {
  if (sortCol === col) {
    sortDir === 'asc' ? setSortDir('desc') : (setSortCol(null), setSortDir('asc'));
  } else {
    setSortCol(col); setSortDir('asc');
  }
};

// Sortable header component inline
<TableHead onClick={() => toggleSort('code')} className="cursor-pointer select-none">
  Code {sortCol === 'code' && (sortDir === 'asc' ? <ArrowUp/> : <ArrowDown/>)}
</TableHead>

// Apply sort to filtered array
const sorted = [...filtered].sort((a, b) => { ... });
```

### Technical Details
- Sheet z-index follows existing layering standard (z-150 for side sheets)
- `DmsDocumentTypesTab` keeps its secondary discipline multi-select inside the Sheet form — no structural changes to that logic
- The `#` column (row index) is not sortable
- Status column sorts by boolean (active first or last)
- All existing create/update/delete mutations remain unchanged

