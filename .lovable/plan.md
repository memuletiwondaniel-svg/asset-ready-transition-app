

## Tighten VCR Item Categories Table and Remove Count Badge

### Changes

**1. Reduce table row padding**
- Change `TableCell` padding from the default `p-4` to `py-2 px-4` for the category table rows only (via className overrides on each `TableCell`)
- This keeps horizontal spacing comfortable while reducing vertical bloat
- Rows will remain dynamic -- they grow naturally if content wraps

**2. Remove the category count badge**
- Remove the `div` containing the count badge ("X categories") from the card header
- The count is redundant since the table data is directly visible below

### File to Modify
- `src/components/handover/VCRItemCategoryTab.tsx`
  - Remove the count badge element (the `div` with `bg-primary/10` styling)
  - Add `py-2` className overrides to each `TableCell` in the category rows and the empty state row to reduce vertical padding

### Result
A more compact, modern table with less visual noise in the header area.
