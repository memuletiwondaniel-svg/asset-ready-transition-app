

## Bug: Plant Director role showing Deputy Plant Directors

### Root Cause

In `src/components/pssr/wizard/WizardStepApprovers.tsx`, lines 88-91, the profile matching for director roles uses a broad filter:

```tsx
if (roleName.includes('director')) {
  return pos.includes(plantLower);
}
```

When the selected role is **"Plant Director"**, this matches both:
- `"Plant Director - BNGL"` (correct)
- `"Dep. Plant Director - BNGL"` (incorrect)

Both positions contain the plant name, so the deputy directors slip through. The code doesn't distinguish between "Plant Director" and "Dep. Plant Director" — it only checks that the position contains the plant name.

### Fix

**File: `src/components/pssr/wizard/WizardStepApprovers.tsx`** — Lines 88-91

Tighten the director matching logic to also verify the position actually contains the role name, not just the plant name. This ensures "Plant Director" only matches positions like "Plant Director - BNGL" and excludes "Dep. Plant Director - BNGL":

```tsx
// Plant-specific director roles: must match both role name AND plant
if (roleName.includes('director')) {
  return posLower.includes(roleName) && posLower.includes(plantLower);
}
```

Since `roleName` is already lowercased (line 65) and `posLower` is the lowercase position (line 69), this comparison is safe. "plant director" will match "plant director - bngl" but NOT "dep. plant director - bngl".

This is a one-line change. It also correctly handles the reverse case — if someone selects the "Dep. Plant Director" role, "dep. plant director" will match "dep. plant director - bngl" but not "plant director - bngl".

### Delegation Note

The user mentioned Plant Directors can delegate to deputies. This is a runtime workflow concern (delegation at PSSR execution time), not a template configuration issue. The template should list only the correct role holders. Delegation can be handled separately if needed.

### Technical Details

- **Role IDs**: Plant Director = `ba9391b0-...`, Dep. Plant Director = `0e8c8c81-...`
- **Current count shown**: 15 (mix of both). After fix: ~6 actual Plant Directors only.
- The existing `role_id` match on line 72 (`p.role_id === roleId`) already correctly distinguishes the two roles. The bug is only in the position-based fuzzy fallback on line 72's second condition (`posLower.includes(roleName)`), but that's handled upstream — the director-specific block on line 89 returns early before the general logic runs, so fixing line 90 is sufficient.

