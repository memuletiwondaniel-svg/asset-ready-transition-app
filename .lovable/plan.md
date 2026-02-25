

## PSSR Item Detail Sheet — Responsible Parties UI Improvements

Three issues to fix in `src/components/pssr/PSSRItemDetailSheet.tsx`:

### 1. Delivering Party name truncation (lines 514-517)

The role name label has `w-24` (96px) which truncates longer role names. Will remove the fixed width and let it flow naturally, or increase it.

**Current** (line 515):
```tsx
<span className="text-[10px] font-medium text-muted-foreground w-24 shrink-0 truncate">
```

**Fix**: Remove `w-24` constraint; the collapsible card approach (item 2) will eliminate this layout entirely.

---

### 2. Use expandable role cards instead of flat avatar lists (lines 502-621)

Currently, the Delivering Party and Approving Parties sections display role names inline with avatar rows. This is inconsistent with the Step 2 wizard pattern which uses collapsible cards showing the role name + personnel count badge, expandable to reveal the people.

**Approach**: Refactor both the Delivering Party and Approving Parties read-only views to use `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` from Radix, matching the exact pattern from `WizardStepApprovers.tsx`:

- Each role renders as a `border rounded-lg bg-muted/50` card
- Collapsed: shows `ChevronRight` + role name + count badge
- Expanded: shows avatar chips with name and position
- Add local state `expandedRoles` (Set) to track which are open

This replaces:
- **Delivering Party** (lines 513-535): single role → single collapsible card
- **Approving Parties** (lines 584-618): multiple roles → multiple collapsible cards in a `space-y-2` container

---

### 3. Use X icon instead of Trash2 for role deletion in edit mode (lines 564-571)

The edit mode approver delete button currently uses `<Trash2>`. For consistency with the template editor and Step 2 wizard (which both use `<X>`), change to `<X>` with the same hover-to-reveal pattern.

**Current** (line 570):
```tsx
<Trash2 className="h-3 w-3" />
```

**Fix**: Replace with `<X className="h-3.5 w-3.5" />` and update the button styling to match the wizard pattern: `text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100`.

---

### Files to modify

- **`src/components/pssr/PSSRItemDetailSheet.tsx`**
  - Add imports: `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`, `ChevronRight`
  - Add `expandedRoles` state (and `deliveringExpanded` for the single delivering card)
  - Rewrite Delivering Party read-only view (lines 513-535) → collapsible card
  - Rewrite Approving Parties read-only view (lines 584-618) → collapsible cards
  - Replace `Trash2` with `X` in edit-mode delete buttons (line 570)
  - `Trash2` can be removed from imports if unused elsewhere in the file

