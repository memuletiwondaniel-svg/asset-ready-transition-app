

## Tone Down Completed Step Styling

The core UX principle: **completed steps should fade into the background**, letting the current step remain the hero. Right now, saturated emerald-500 on circles, labels, and connectors fights for attention against the active step.

### Changes

1. **Completed Step Circles** -- Swap from bold `bg-emerald-500 text-white` to a softer, muted treatment: `bg-emerald-100 text-emerald-600 border border-emerald-200` (dark mode: `dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700`). Remove the green shadow glow. The check icon alone communicates "done" without needing a loud filled circle.

2. **Completed Step Labels** -- Shift from `text-emerald-600` to a neutral `text-muted-foreground`. Once a step is done, its label doesn't need color coding -- the circle's check icon already signals completion.

3. **Connector Lines** -- Change completed connectors from `bg-emerald-500` to a softer `bg-emerald-300 dark:bg-emerald-700`. They should read as a quiet trail, not a highway.

4. **Amber connectors** -- Also soften slightly to `bg-amber-200 dark:bg-amber-700` for consistency.

### Result

The current step (primary ring + scale) stays the clear focal point. Completed steps feel settled and quiet. The overall progress bar reads as a calm timeline rather than a traffic light.

### Technical Details

**File**: `src/components/widgets/p2a-wizard/WizardProgress.tsx`

- Line 48 (completed circle): change to `bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700`
- Line 66 (completed label): change `text-emerald-600 dark:text-emerald-400` to `text-muted-foreground`
- Line 84 (connector done): change `bg-emerald-500` to `bg-emerald-300 dark:bg-emerald-700`
- Line 84 (connector in-progress): change `bg-amber-300 dark:bg-amber-600` to `bg-amber-200 dark:bg-amber-700`

No new files or dependencies needed.

