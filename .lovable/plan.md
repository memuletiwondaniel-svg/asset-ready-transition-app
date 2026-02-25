

## Analysis

You raise two good points:

### 1. Icon consistency: PSSR Lead vs PSSR Approvers

Currently:
- **PSSR Lead** uses a `Shield` icon (emerald) — which doesn't visually convey "person"
- **PSSR Approvers** section heading uses a `Users` icon (blue) — which clearly conveys "people"

Your suggestion is correct from a modern UI/UX perspective. Using **`User`** (single person, from lucide-react) for PSSR Lead and **`Users`** (multiple people) for PSSR Approvers creates a natural visual pairing that immediately communicates the 1-vs-many distinction. The `Shield` icon is semantically weaker here.

### 2. Colored dots in front of selected roles — are they needed?

Currently:
- **Green dot** (`bg-emerald-500/60`) before the selected PSSR Lead role name
- **Blue dot** (`bg-primary/60`) before each selected PSSR Approver role name

These dots are **redundant visual noise**. The cards are already clearly differentiated by:
- Being inside their respective labeled sections (PSSR Lead vs PSSR Approvers)
- Having the chevron expand icon
- Having distinct section headings with icons

The dots add no additional information and clutter the card. Removing them is the cleaner, more modern approach — the section context and card structure already provide enough visual hierarchy.

## Plan

**File: `src/components/pssr/wizard/WizardStepApprovers.tsx`**

1. **Replace `Shield` icon with `User` icon** for the PSSR Lead section heading (line 161), keeping the emerald color
2. **Update import** — add `User` to the lucide-react import, remove `Shield` (line 10)
3. **Remove the green dot** (`<div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 ...">`) from the selected PSSR Lead card (line 183)
4. **Remove the blue dot** (`<div className="w-1.5 h-1.5 rounded-full bg-primary/60 ...">`) from each selected PSSR Approver card (line 325)

**File: `src/components/pssr/wizard/WizardStepApproversSetup.tsx`**

5. **Replace `UserCircle` icon with `User` icon** in the PSSR Lead section heading (line 74), keeping the emerald color
6. **Update import** — swap `UserCircle` for `User` (line 10)

