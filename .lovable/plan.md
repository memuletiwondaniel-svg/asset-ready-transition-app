

## Center the Approval Signature Panels

The two signature panels (Plant Director and Project Hub Lead) are currently in a 3-column grid (`lg:grid-cols-3`), which leaves them skewed to the left since only 2 of 3 columns are filled.

### Change
Update the grid from `lg:grid-cols-3` to `md:grid-cols-2` only, so the two panels naturally center within the available space. No changes to card width, shape, or content.

### Technical Detail
In `PACCertificate.tsx` (line 414), change:
```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4
```
to:
```
grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 max-w-2xl mx-auto
```

This adds `max-w-2xl mx-auto` to constrain and center the two-column grid, while removing the unused `lg:grid-cols-3`.

