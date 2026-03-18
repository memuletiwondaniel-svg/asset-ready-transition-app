

## Fix: Darken VCR Wizard when Add Training modal opens

### Problem
The `AddTrainingWizard` dialog has its content at `z-[150]`, but the `DialogOverlay` (the dark `bg-black/80` backdrop) stays at the default `z-50`. Since the VCR wizard sits at `z-[100]`, the backdrop renders *behind* the wizard — so nothing visually dims.

### Solution
Add an optional `overlayClassName` prop to `DialogContent` in `dialog.tsx`, then pass `z-[150]` from `AddTrainingWizard` (and any other nested modals that need to dim their parent).

### Changes

**1. `src/components/ui/dialog.tsx`**
- Add `overlayClassName?: string` to `DialogContent` props
- Pass it through to `<DialogOverlay className={overlayClassName} />`

**2. `src/components/widgets/vcr-wizard/steps/AddTrainingWizard.tsx`**
- Add `overlayClassName="z-[150]"` to the `<DialogContent>` so the backdrop matches the content's z-index

This ensures when the training modal opens, the dark overlay covers the entire VCR wizard behind it, letting the user focus on the modal.

