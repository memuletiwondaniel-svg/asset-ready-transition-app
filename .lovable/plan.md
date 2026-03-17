

# Fix VCR Plan Wizard Width Constraint

## Problem
The VCR Execution Plan Wizard (`VCRExecutionPlanWizard.tsx`) uses `max-w-5xl` (1024px) on desktop, making it feel cramped compared to the P2A wizard which uses `sm:max-w-6xl sm:w-[95vw]`. On a 1586px viewport, there's ~560px of wasted space.

## Fix
Align the VCR wizard's dialog sizing with the P2A wizard pattern — the established standard in this codebase.

**File: `src/components/widgets/vcr-wizard/VCRExecutionPlanWizard.tsx`** (line 153-158)

Change the desktop DialogContent class from:
```
max-w-5xl h-[min(90vh,780px)]
```
To match the P2A wizard pattern:
```
sm:max-w-6xl sm:w-[95vw] sm:h-[min(88vh,800px)] sm:!max-h-[88vh]
```

Also add the z-index (`z-[100]`) and full mobile treatment (`!inset-0 !max-h-full !translate-x-0 !translate-y-0 !rounded-none h-[100dvh]`) consistent with the P2A wizard, replacing the current mobile branch.

Single file change, ~5 lines modified. No logic or state changes.

