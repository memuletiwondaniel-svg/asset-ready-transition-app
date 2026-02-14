

## Modernize Wizard Progress Bar UI

The current step indicator uses simple colored circles with flat connector lines. Here's a plan to give it a more polished, modern look inspired by contemporary wizard/stepper patterns:

### Design Changes

1. **Step Circles** -- Slightly larger (w-8 h-8), with subtle shadows and a soft gradient feel instead of flat colors:
   - **Completed**: Emerald with a subtle shadow glow (`shadow-sm shadow-emerald-200`)
   - **Current**: Primary color with a soft pulsing ring effect (`ring-4 ring-primary/20`) and slight scale-up for emphasis
   - **Incomplete/Amber**: Keep amber but with softer border treatment
   - **Future**: Light muted with a more refined border instead of flat bg-muted

2. **Connector Lines** -- Replace the thin flat lines with slightly thicker, rounded connectors (`h-[3px] rounded-full`) that feel more intentional. Add a subtle gradient transition between states.

3. **Step Labels** -- Bump up slightly to `text-[11px]`, increase max-width for readability (`max-w-[72px]`), and add a subtle opacity transition on hover.

4. **Container** -- Remove the hard `border-b` and replace with a softer bottom shadow (`shadow-[0_1px_3px_-1px_rgba(0,0,0,0.1)]`), and use slightly more vertical padding for breathing room.

5. **Hover Interaction** -- Add a scale transform on hover (`hover:scale-105`) for clickable steps, making it feel more interactive.

### Technical Details

**File to modify**: `src/components/widgets/p2a-wizard/WizardProgress.tsx`

- Update container: `px-6 py-4 bg-muted/20 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]` (remove `border-b`)
- Step circle: `w-8 h-8` with state-specific shadows
  - Completed: `bg-emerald-500 text-white shadow-sm shadow-emerald-300/50`
  - Current: `bg-primary text-primary-foreground ring-4 ring-primary/15 shadow-sm shadow-primary/20`
  - Amber: keep existing but add `shadow-sm shadow-amber-200/50`
  - Future: `bg-muted/80 text-muted-foreground border border-border/50`
- Connector lines: `h-[3px] rounded-full` (from `h-0.5`), adjust `mt-4` to match new circle size
- Labels: `text-[11px] max-w-[72px]`
- Clickable hover: `hover:scale-105 transition-transform`

No new dependencies or files needed -- purely styling updates within the existing component.

