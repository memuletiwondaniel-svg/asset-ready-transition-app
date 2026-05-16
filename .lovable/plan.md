# CMS Competency Milestones, Weighting & Sequencing

Extend the Competency Management System so progress towards "closing" a competency is driven by weighted, optionally sequenced activities, and visualised against three milestones: **Knowledge → Skill → Mastery**.

## 1. Milestones model

Three fixed milestones per competency, with default thresholds (overridable per competency):

- **Knowledge** — default 50%
- **Skill** — default 75%
- **Mastery** — default 100%

The numbers the user mentioned (50 / 70 / 90) are kept as suggested defaults but made editable per competency, since different competencies may need different cut-offs.

Stored on `competencies`:
- `knowledge_threshold` (int, default 50)
- `skill_threshold` (int, default 75)
- `mastery_threshold` (int, default 100)

A person's current milestone is derived from their `person_competency_progress.progress` value.

## 2. Activity weighting

Each `competence_activities` row gets a `weight` (int, percentage points). The sum of weights for a competency's active activities should equal 100. We will:

- Add `weight` column (default 0, must be 0–100).
- Add a validation trigger that warns (not blocks) if a competency's activity weights don't sum to 100.
- Recompute `person_competency_progress.progress` as the sum of weights of completed activities, via a trigger on `person_activity_records`.
- Recompute `status` from progress vs. the competency's thresholds (`not_started` → `in_progress` → `assessed` at Knowledge → `competent` at Mastery).

Example: 10 activities — first worth 20, next two worth 10, etc. Completing the first jumps the bar by 20%.

## 3. Sequencing

Add `sequence_order` (int) and `is_sequence_strict` (bool) to `competence_activities`:

- `sequence_order` defines the **recommended** order (smaller = earlier). Used purely for display ordering when `is_sequence_strict = false` (default).
- When `is_sequence_strict = true`, the UI prevents marking a later activity as `in_progress`/`completed` until all earlier ones are `completed`. Enforced both client-side (disabled buttons + tooltip) and via a DB trigger on `person_activity_records`.

## 4. UI changes (`CMSLandingPage.tsx` + new `CompetencyDetailDrawer`)

- **Readiness bar** in the People table gets three milestone tick marks (K/S/M) with labels and a coloured fill that changes hue as it crosses each threshold (amber → blue → emerald).
- New **Competency detail drawer** opened by clicking a person's competency row:
  - Header: competency name, current % and milestone badge.
  - Milestone ruler with the three thresholds.
  - Ordered activity list showing: sequence #, title, type, **weight chip**, status, "Mark complete" button. Locked rows show a lock icon + "Complete previous activities first" tooltip when sequencing is strict.
  - Footer summary: "X of Y activities complete · Z% progress · next milestone: Skill (need 15% more)".
- Mobile: drawer becomes a full-screen sheet; activity rows collapse to two lines with the weight chip on the right.

## 5. Technical details

```text
competencies
  + knowledge_threshold  int  default 50
  + skill_threshold      int  default 75
  + mastery_threshold    int  default 100

competence_activities
  + weight               int  default 0   (0..100)
  + sequence_order       int  default 0
  + is_sequence_strict   bool default false   -- per-activity gate flag

triggers
  trg_recalc_progress  AFTER INS/UPD/DEL on person_activity_records
    → recompute person_competency_progress.progress and status
  trg_enforce_sequence BEFORE INS/UPD on person_activity_records
    → if activity.is_sequence_strict, block unless all lower sequence_order
      activities for same person+competency are completed
  trg_validate_weights AFTER INS/UPD/DEL on competence_activities
    → raise NOTICE (not exception) if SUM(weight) <> 100 for competency
```

Existing mock data: backfill `weight` evenly across each competency's activities and `sequence_order` by insertion order so the UI has something to show immediately.

## 6. Open questions (assumptions if not answered)

- Thresholds editable per competency? **Assumed yes**, with global defaults 50/75/100.
- Strict sequencing default? **Assumed off** — recommended order only, opt-in per activity.
- "Closed" competency = reaches Mastery (100%) by default.

Approve and I'll run the migration and build the UI.
