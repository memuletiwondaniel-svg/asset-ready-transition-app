

## Analysis: Edit Template Step 1 vs Create PSSR Step 1

### Current State

**Create New PSSR** (Step 1 - `WizardStepCategory.tsx`):
- Rich interactive **card-based** selector with icons, color-coded backgrounds, hover effects, and check indicators
- Name as primary label, description as muted subtext beneath
- Visual, scannable, modern

**Edit/Add PSSR Template** (Step 1 - `WizardStepReasonDetails.tsx`):
- Plain `<Select>` dropdown for reason selection
- Description shown as subtext only after selection
- Also includes PSSR Lead Role selector and Additional Description textarea

### Best Modern UI/UX Approach

The **card-based selector** from the Create flow is the stronger pattern. It follows modern UI conventions (Notion, Linear, Figma) where important categorical choices use visually distinct, scannable cards rather than hidden dropdowns. For consistency, Step 1 of the template wizard should adopt the same card-based reason selector.

However, the template wizard's Step 1 also contains additional fields (PSSR Lead Role, Description) that don't exist in the Create flow. These should remain but the reason selector portion should be upgraded.

### Plan

**File: `src/components/pssr/wizard/WizardStepReasonDetails.tsx`**

1. **Replace the `<Select>` dropdown** with the same card-based layout used in `WizardStepCategory.tsx`:
   - Import the same icon mapping logic (`getReasonCardConfig`, `getDisplayName`)
   - Render each reason as a clickable card with icon, hue-based gradient, name as primary label, description as subtext
   - Include the "Other" card at the bottom with a `HelpCircle` icon
   - When "Other" is selected, show the custom reason `<Input>` field below the cards

2. **Extract shared card config** into a small utility to avoid duplication:
   - Move `getReasonCardConfig` and `getDisplayName` from `WizardStepCategory.tsx` into a shared file (e.g., `src/components/pssr/wizard/reasonCardConfig.ts`)
   - Import from both `WizardStepCategory.tsx` and `WizardStepReasonDetails.tsx`

3. **Keep the remaining fields unchanged**:
   - PSSR Lead Role popover selector stays as-is
   - Additional Description textarea stays as-is

### Technical Details

- The card layout reuses the exact same styling: `rounded-xl border-2`, hue-based gradients, `CheckCircle2` indicator, hover overlays
- The reason options are already fetched from `pssr_reasons` table in both components
- The "Other" flow (custom input) will render below the card grid when the Other card is selected
- No database changes required

