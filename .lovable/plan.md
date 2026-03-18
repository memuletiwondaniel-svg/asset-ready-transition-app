

## Fix: Consistent Modal Dimensions Across All Steps

### Problem
The Add Training modal resizes as users navigate between steps because each step has different content heights. The `ScrollArea` has no fixed height — it uses `flex-1 min-h-0`, which causes the dialog to shrink/grow based on content.

### Solution
Set a fixed `min-height` on the `ScrollArea` so the modal maintains consistent dimensions regardless of which step is active. The dialog already has `max-h-[90vh]` and `flex flex-col`, so we just need to enforce a stable content area height.

### Change

**`src/components/widgets/vcr-wizard/steps/AddTrainingWizard.tsx`** (line 273)

Change the `ScrollArea` from:
```
<ScrollArea className="flex-1 min-h-0">
```
to:
```
<ScrollArea className="flex-1 min-h-[320px]">
```

This ensures the content area never collapses below 320px, keeping the header, content, and footer in a stable layout across all 5 steps. Steps with less content will have whitespace; steps with more content will scroll — the modal shell stays fixed.

