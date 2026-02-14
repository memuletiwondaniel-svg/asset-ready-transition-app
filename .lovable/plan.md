

## De-emphasize Sibling VCR Cards on Hover

A subtle "focus + context" effect that dims sibling VCR cards when hovering over one, scoped to the parent phase card.

### Approach

Use a CSS-only `group/phase` + `hover` strategy on the phase container. When any VCR card inside a phase is hovered, all sibling cards reduce opacity. No React state needed — pure Tailwind/CSS.

### Technical Details

**File:** `src/components/widgets/p2a-wizard/steps/WorkspacePreviewStep.tsx`

1. Add `group/phase` class to each phase card container (the `div` with `min-w-[150px]`)
2. Add a wrapper `div` with class `group/vcr` around each VCR `HoverCard`
3. Apply these Tailwind classes to VCR card wrappers:
   - `transition-opacity duration-150` for smooth animation
   - Use the CSS selector pattern: when the phase container is hovered (`group-hover/phase`), reduce all cards to `opacity-50`, but restore `opacity-100` on the individually hovered card (`hover:opacity-100`)

This is achieved by adding to the VCR card's outer wrapper:
```
className="transition-opacity duration-150 group-hover/phase:opacity-40 hover:!opacity-100"
```

No new state, no new dependencies — just 2 class additions.

