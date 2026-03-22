

## Redesign Step 2: Document Selection Table

### Problem
The document selection table is cluttered — rows are too tall, badges too large, sidebar too wide, a column is cut off, and only ~4 rows are visible at a time.

### Changes (single file: `DocumentSelectionStep.tsx`)

**1. Compact 40px rows**
- Set `h-10` on every `TableRow` in the body
- Add `whitespace-nowrap overflow-hidden text-ellipsis max-w-0` to the Document Name `TableCell`, with a `title={doc.document_name}` attribute for hover tooltip
- Reduce cell padding from `p-4` to `px-2 py-1.5` on all cells

**2. Tier badges → inline pills**
- Replace the rounded `Badge` with a plain `<span>` using `text-[11px] px-1.5 py-[2px] rounded-[4px] border font-medium` and tier-specific light background/text colors (orange for Tier 1, blue for Tier 2, grey for RLMU). Max height ~20px, no circles.

**3. Compact discipline filter pills**
- Reduce filter chip buttons from `px-2.5 py-1 text-[11px]` to `px-2 py-0.5 text-[11px]` — roughly half height
- Remove the colored dot span entirely for cleaner look
- Keep single/two-row flex-wrap layout

**4. Fix cut-off column**
- The 5th column "Discipline" is being cut off to show only "D". Fix by constraining all columns to explicit widths and ensuring the table uses `table-fixed` layout with `w-full`.

**5. Sidebar width: 140px**
- Change `w-52` (208px) to `w-[140px]` on the sidebar container
- Reduce sidebar text to `text-xs`

**6. Column sizing**
- Apply `table-fixed w-full` to the `<Table>` element
- Checkbox: `w-8` (32px)
- Code: `w-[60px]`
- Document Name: no explicit width (flex/remaining)
- Tier: `w-[60px]`
- Discipline: `w-[80px]`
- Header text: `text-[11px] uppercase tracking-wider text-muted-foreground` on all `TableHead` cells

**7. Consistent 16×16 checkboxes**
- Checkboxes already use the default `h-4 w-4` (16px) from the Checkbox component — no change needed, just ensure no overrides exist.

**8. Header row**
- Reduce header row height to match compact style: `h-9` instead of default `h-12`

### Result
With 40px rows and compact filters, 8-10 document rows will be visible without scrolling on a standard screen. No functionality changes — filtering, search, system nav, and selection logic remain identical.

