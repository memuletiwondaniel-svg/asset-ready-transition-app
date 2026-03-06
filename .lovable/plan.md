

## Analysis

After reviewing the codebase, here are the 5 issues and their solutions:

### 1. ID Label Colors — Use Per-Activity Hue Rotation (Best Modern Approach)

The modern approach for same-phase activities is **sequential hue rotation within a harmonious palette**. Since all activities share the same prefix (e.g., EXE), they all get the same color. Instead, we'll assign each activity a **unique but cohesive color** using its sequential index mapped to a curated palette of 8-10 distinct but harmonious colors (e.g., indigo, sky, violet, rose, teal, amber, emerald, fuchsia). This provides visual scanability without implying semantic meaning — a pattern used by Linear, Notion, and Asana.

**Implementation:** Replace `getIdBadgeClasses(code)` with `getActivityBadgeClasses(index)` using a rotating palette array in `StepSchedule.tsx`.

### 2. Progress Indicator — Numbered Steps (Best Modern Approach)

Modern wizard patterns (Stripe, Linear, Vercel) show the **number inside the circle** for incomplete steps and a **checkmark for completed** ones. The current implementation already does this. Adding "1. Phase" as a label below is redundant since the number is in the circle. The current approach is already best practice. **No change needed.**

### 3. Default Collapsed State for Parent Activities

Currently, the `expandedIds` state initializer expands all root parents by default (line 269-272). Change it to initialize as an **empty Set** so all parents start collapsed.

**File:** `StepSchedule.tsx`, line 269-272 — change to `new Set()`.

### 4. Custom Activity Not Persisting on Save & Return

The draft save (`handleSaveDraft` in `ORAActivityPlanWizard.tsx`) correctly serializes all `activities` to `wizard_state`. However, the draft restore (line 70-100) has a bug: when `currentStep === 3` AND `activities.length === 0`, it **overwrites** loaded activities with catalog defaults. But when restoring from draft, activities are loaded *before* step 3 renders. The issue is that the effect at line 71 checks `activities.length === 0` — but if the user navigates back to step 3 after loading a draft with custom activities, the condition fails (correctly). 

The real bug: when draft loads activities at line 131, and then user navigates to step 4, then back to step 3 — `currentStep === 3` triggers but `activities.length > 0` so it's fine. But if the user added a custom activity on step 4, went back, the effect won't overwrite.

Actually, the more likely issue: the `useEffect` at line 70-100 fires when `currentStep` changes to 3. If the draft was loaded with activities already populated, `activities.length === 0` is false, so it won't overwrite. This should work correctly.

Let me re-examine: the user says "Saved Custom activity is not saving when I return back." This likely means the auto-save on step transition is not happening. Currently, save only happens when user clicks "Save & Exit". We should add **auto-save on step transitions** (when navigating between steps).

**Fix:** In `ORAActivityPlanWizard.tsx`, add auto-save of wizard state to draft when stepping forward/backward, so custom activities added in Step 4 persist automatically.

### 5. Relations Button Active State

The Relations button already uses `variant={showRelationships ? 'secondary' : 'outline'}` (line 517). But `secondary` variant may not look distinct enough. Enhance with a more visible active state — add primary ring/border styling when active.

**File:** `StepSchedule.tsx`, line 516-524 — add `border-primary text-primary bg-primary/10` when active.

---

## Summary of Changes

| # | Change | File |
|---|--------|------|
| 1 | Per-activity color rotation for ID badges | `StepSchedule.tsx` |
| 2 | No change needed (current approach is best practice) | — |
| 3 | Default parent activities to collapsed | `StepSchedule.tsx` |
| 4 | Auto-save wizard state on step transitions | `ORAActivityPlanWizard.tsx` |
| 5 | Enhanced active state for Relations button | `StepSchedule.tsx` |

