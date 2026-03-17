

# P2A Wizard vs VCR Plan Wizard: Comparative UI/UX Analysis

## Current State Comparison

| Aspect | P2A Wizard | VCR Plan Wizard |
|--------|-----------|-----------------|
| **Layout** | Top header + horizontal step bar + content + footer | Left sidebar (desktop) / pill tabs (mobile) + content + footer |
| **Navigation Pattern** | Horizontal stepper with numbered circles + connectors | Vertical sidebar with step list |
| **Header** | Gradient icon + title + project context + delete action | Hidden DialogTitle; VCR badge + name in sidebar |
| **Progress Indicator** | Shared `WizardProgress` component with completion/warning states | Custom inline dot indicators in footer |
| **Footer** | Shared `WizardNavigation` component (Back, Save & Exit, Next/Submit) | Inline buttons (Back, Save & Exit, dots, Next/Done) |
| **Step Completion** | Data-driven validation (systems > 0, VCRs > 0, etc.) + amber warning for incomplete | Visit-based + row-count queries |
| **Mobile** | Full-screen `100dvh`, horizontal scroll stepper | Full-screen `100dvh`, scrollable pill tabs |
| **Approval Flow** | Full review mode with approve/reject, comments, progress tracking | None (no submission workflow yet) |
| **Auto-save** | Saves on Next click | No auto-save |
| **Banners** | Rejection, revert, read-only, and review banners | None |
| **Accessibility** | Missing `DialogTitle` (no VisuallyHidden) | Has VisuallyHidden DialogTitle |

## Key Inconsistencies

1. **Two completely different navigation paradigms** — horizontal stepper (P2A) vs vertical sidebar (VCR). Enterprise SaaS best practice is one consistent pattern across all wizards.
2. **No shared components** — VCR wizard duplicates footer navigation inline instead of using `WizardNavigation`. P2A uses `WizardProgress`; VCR does not.
3. **Header treatment** — P2A has a branded gradient header with project context; VCR hides its title and puts context in the sidebar.
4. **Step completion semantics differ** — P2A uses data validation; VCR uses visited + row counts. Neither surfaces validation errors inline.
5. **No auto-save in VCR wizard** — users can lose work.
6. **VCR wizard lacks accessibility** — no visible header for screen readers in the content area.

## How This Compares to Best-in-Class Enterprise SaaS

Modern enterprise wizard patterns (Linear, Notion, Figma, Salesforce Lightning) share these traits:

- **Consistent wizard shell** — one reusable layout component for all multi-step flows
- **Vertical sidebar navigation on desktop** — better for 5+ steps (both wizards qualify); horizontal steppers reserved for 3-4 steps max
- **Persistent header with context** — entity badge, title, and status always visible
- **Auto-save with visual feedback** — "Saved" indicator, not manual save buttons
- **Inline validation** — step indicators show errors/warnings before the user leaves
- **Keyboard navigation** — arrow keys to move between steps
- **Unified footer** — shared component with consistent button placement

## Standardization Plan

### 1. Create a shared `WizardShell` layout component
A single reusable component that both wizards (and any future wizards) will use. It will encapsulate:
- Full-screen mobile / 6xl desktop dialog sizing
- **Vertical sidebar navigation on desktop** (the VCR pattern is better for 5+ steps — adopt it as the standard)
- **Scrollable pill tabs on mobile** (already used by VCR — adopt as standard)
- Branded header area with entity badge, title, subtitle, and action slot
- Content area with overflow handling
- Standardized footer using the existing `WizardNavigation` component

### 2. Refactor P2A Wizard to use `WizardShell`
- Replace the horizontal `WizardProgress` stepper with the vertical sidebar pattern
- Move header content (gradient icon, title, project code) into the shell's header slot
- Replace inline footer with `WizardNavigation` (already done)
- Keep all P2A-specific features (banners, review mode, approval flow) as content passed to the shell

### 3. Refactor VCR Wizard to use `WizardShell`
- Replace the inline sidebar and footer with the shared shell
- Add a proper branded header (matching P2A's gradient icon style but with a VCR-appropriate icon/color)
- Replace inline footer buttons with `WizardNavigation`
- Add auto-save on step navigation (matching P2A behavior)

### 4. Add auto-save indicator to `WizardNavigation`
- Replace the manual "Save & Exit" with an auto-save pattern: save on every step change, show a subtle "Saved" timestamp in the footer
- Keep "Save & Exit" as the close action but rename to just "Close" since saves are automatic

### 5. Standardize step completion logic
- Both wizards should use data-driven validation (not just "visited")
- Surface incomplete steps with the amber warning indicator (already in `WizardProgress`, extend to sidebar)
- Add the `AlertCircle` warning icon to the vertical sidebar for steps that were visited but have no data

### Technical Approach

**New file:** `src/components/widgets/shared/WizardShell.tsx`

```text
+--------------------------------------------------+
| [Icon] Title                          [Actions]  |  <- Header slot
|         Subtitle / project context               |
+--------+-----------------------------------------+
|        |                                         |
| Step 1 |   Content Area                          |  <- children
| Step 2 |   (scrollable)                          |
| Step 3 |                                         |
| ...    |                                         |
|        |                                         |
|--------+-----------------------------------------|
| Step   |  [Back] [Save & Exit]    [Next →]       |  <- WizardNavigation
| N of M |                                         |
+--------+-----------------------------------------+
```

Props for `WizardShell`:
- `steps`: array of `{ id, label, icon?, color? }`
- `currentStep`, `onStepChange`
- `isStepComplete`: callback `(idx) => boolean`
- `isStepWarning`: callback `(idx) => boolean` (visited but incomplete)
- `header`: ReactNode (branded icon + title area)
- `headerActions`: ReactNode (delete button, close, etc.)
- `banners`: ReactNode (rejection/review banners, inserted between header and content)
- `footer`: ReactNode or use built-in `WizardNavigation` with forwarded props
- `children`: step content

Both wizards would then become thin wrappers: step definitions + step content + business logic, with all layout and navigation handled by the shell.

### Files to create/modify
- **Create:** `src/components/widgets/shared/WizardShell.tsx` — shared layout
- **Modify:** `src/components/widgets/p2a-wizard/P2APlanCreationWizard.tsx` — adopt WizardShell, remove inline layout
- **Modify:** `src/components/widgets/vcr-wizard/VCRExecutionPlanWizard.tsx` — adopt WizardShell, add auto-save, proper header
- **Modify:** `src/components/widgets/p2a-wizard/WizardNavigation.tsx` — add auto-save indicator
- **Potentially deprecate:** `src/components/widgets/p2a-wizard/WizardProgress.tsx` — replaced by sidebar in shell

