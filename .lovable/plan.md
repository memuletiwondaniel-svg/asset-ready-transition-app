
# Critique of the Independent Assessment

The assessment is mostly right but soft in places. Where it lands:

- **Triple progress indicator** — correct. "Step 1 of 5" + Progress bar + numbered circles is genuinely redundant. Worth fixing.
- **Internal scroll on Step 1** — correct. Seven fields should never scroll inside an 85vh modal.
- **Nested containers** — correct. Card-in-modal-in-overlay is three layers of chrome.
- **Disabled fields don't look disabled** — correct. The locked Hub combobox is visually identical to an active one.
- **Auto-assignment is invisible until Review** — correct, and arguably the highest-value fix in the whole wizard. The form keeps promising magic ("drives auto-assignment of…") and never shows it.
- **Stepper should reflect validity** — correct. Right now `visitedSteps` only tracks "have you been here," not "is it valid."

Where the assessment is weak or wrong:

- **"Lock DP- as a fixed prefix, monospace, free-form text after"** — half right. Locking DP is correct (we already do). But the assessment then argues for *no format rule at all* because "ORSH doesn't own the scheme." That's overcorrection. The current implementation already accepts alphanumeric + hyphen and uppercases — which is exactly the "free-form but sane" middle ground. The real missing piece isn't loosening validation, it's the **duplicate check against existing projects**, which the assessment correctly calls out.
- **"Autosave as a draft"** — sounds great, costs a schema migration (`project_drafts` table, RLS, cleanup policy, conflict handling on resume). For a 5-step form opened from a button, a **discard-confirm dialog** delivers 90% of the protection at 5% of the cost. Recommend confirm-on-dismiss now, defer drafts.
- **"Provenance hint: Official DP number from the [register]"** — good framing, but the assessment leaves `[register]` as a placeholder. We should either name the actual source (ASSAI? a spreadsheet?) or drop the hint rather than ship a bracketed TODO.
- **Removing the context banner is not discussed** — but it's redundant with a good stepper + persistent project chip in the header. Worth flattening.
- **"auto-assigned" badge on the Project ID field (visible in the screenshot)** — the assessment misses this entirely. It directly contradicts the assessment's own thesis that ORSH is *recording* not *creating* the ID. That badge is a lie and must go.

# Proposed Design

## 1. Header chrome — one stepper, not three

Replace the current `DialogHeader` block (title + "Step 1 of 5" + Progress bar + 5 numbered circles) with a single segmented track:

```text
Project info ──●━━━━━━━━━━ Scope ──○────── Team ──○────── Milestones ──○────── Review ──○
```

- One row, five segments. Active segment filled with `bg-primary`, completed segments `bg-primary/40` with a check, future segments `bg-muted`, invalid-but-visited segments `bg-destructive/30` with a ring.
- Step labels inline (no separate circles row). Click-to-jump only to visited+valid steps.
- "Step 1 of 5" moves to the footer next to Next ("Step 1 of 5 · Next →").
- Drops ~80px of vertical chrome — Step 1 now fits without scrolling at 1080p and most laptops.

## 2. Step 1 layout — flatten sections, kill internal scroll

Remove the `Section` component's bordered card (`rounded-xl border bg-card/40 p-5`). Replace with a label-only group:

- Section title: uppercase 11px muted, no card, no icon tile. A 1px hairline `border-t border-border/40` separates groups.
- Helper text sits inline after the title in the same muted style ("OWNERSHIP — auto-assigns Commissioning Lead, Construction Lead & Snr ORA Engineer").
- Three groups stay: Identity, Ownership, Location. Spacing reduced from `space-y-4` between cards to `space-y-5` between flat groups — visually lighter, vertically tighter.

## 3. Project ID field — transcription, not generation

- Remove the "auto-assigned" pill. It's wrong and misleading.
- Keep the locked `DP` chip + alphanumeric input (current behavior is correct).
- Add a **debounced duplicate check** against `projects` table on blur and on Next. On hit:
  - Field gets `border-destructive` and an inline message: *"DP-385 already exists — West Qurna OT2/3 gas feed to CS."*
  - Next is blocked until resolved.
- Subtle helper under the field: *"Enter the official DP number from the project register."* (Generic phrasing — no bracketed placeholder. If we later identify the canonical register, we link it.)
- No "next free number" suggestion, no format mask beyond the existing alphanumeric filter.

## 4. Real disabled state for dependent selects

`EnhancedCombobox` currently renders disabled state the same as enabled. Add a disabled variant:

- `border-dashed border-border/60`, `bg-muted/30`, lock icon prefix, muted text.
- Applied automatically when `disabled` prop is true. Affects: Hub (until Portfolio), Field (until Plant), Station (until Field or Plant-with-no-fields).

## 5. Live auto-assignment preview

The biggest UX win. As soon as Portfolio is selected, render under the Ownership group:

```text
Will be auto-assigned
  Commissioning Lead   Ali Zachi
  Construction Lead    Sara Hadi
  Snr ORA Engineer     Mahmoud R.
```

And under Location, when Plant is selected:

```text
  Deputy Plant Director   Hassan K.
```

- Small, muted, no card. Resolved live from the existing role-assignment hooks (`usePortfolioManagers` / role-by-region queries already exist).
- If no one is assigned to that role for that portfolio/plant: *"No Commissioning Lead assigned for North — can be set later."* in `text-amber-600`.
- Makes the promise concrete before Review.

## 6. Loss protection — confirm, don't autosave (yet)

- Dirty-check on `onOpenChange(false)` and Cancel: if any field touched, show `AlertDialog`: *"Discard this project? Your progress will be lost."* with Discard / Keep editing.
- ESC and backdrop click route through the same confirm.
- Defer the drafts table (separate proposal — out of scope here).

## 7. Stepper validity model

Replace the binary `visitedSteps` Set with a per-step state: `'pending' | 'valid' | 'invalid' | 'active'`.

- `valid`: check icon, primary tint, clickable.
- `invalid`: red ring, clickable (so user can fix).
- `pending`: muted, not clickable.
- `active`: filled primary.
- Step click runs that step's validator before allowing jump-ahead.

## 8. Context banner (steps 2+) — flatten

The current cross-step context banner (Project / Portfolio / Hub chips in a muted card) duplicates information that should live in the dialog title once Step 1 is complete. Replace with a single subtitle line under "Create New Project":

> `DP-355 · Crude Stabilization Upgrade — North › Basra Hub`

One line, muted, always visible from Step 2 onward. Banner card removed.

---

# Technical Notes

**Files to change**
- `src/components/project/CreateProjectWizard.tsx` — header chrome (remove Progress + circles, add segmented stepper), footer (add step counter next to Next), dirty-confirm dialog, validity-aware step state, replace context banner with title subtitle.
- `src/components/project/wizard/WizardStepProjectInfo.tsx` — drop `Section` card chrome, add duplicate-ID check (debounced query against `projects`), add `LiveAssignmentPreview` subcomponent under Ownership and Location, remove "auto-assigned" pill if rendered here.
- `src/components/ui/enhanced-combobox.tsx` — disabled variant (dashed border, lock icon, muted fill).
- New: `src/components/project/wizard/LiveAssignmentPreview.tsx` — small presentational component, takes `regionId` / `plantId`, renders resolved role-holders or amber "not assigned" hint. Reuses existing portfolio-manager hooks.
- New: `src/hooks/useProjectIdAvailability.ts` — debounced `supabase.from('projects').select('id, project_title').eq('project_id_prefix', 'DP').eq('project_id_number', n)`.

**Out of scope (call out, don't build)**
- Project drafts table / autosave.
- Canonical "DP register" link target (need product input on source of truth).
- Renaming "Sub Area → Field" anywhere else in the app (already done in Step 1).

**Approx LOC**: ~250 lines changed/added, no DB migration, no new dependencies.
