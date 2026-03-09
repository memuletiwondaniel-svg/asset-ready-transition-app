
# Widen P2A Plan Creation Wizard Modal

## Problem
The P2A Plan Creation Wizard dialog is constrained at `max-w-4xl` (896px) with a fixed height of `min(85vh, 720px)`. For a multi-step wizard with systems, VCRs, mapping, and approval setup, this feels cramped — especially on modern wide screens.

## Change

**File: `src/components/widgets/p2a-wizard/P2APlanCreationWizard.tsx` (~line 398)**

Update the `DialogContent` className:
- Width: `max-w-4xl` → `max-w-5xl` (1024px) — provides ~15% more horizontal space without overwhelming smaller screens
- Height: `h-[min(85vh,720px)]` → `h-[min(88vh,800px)]` — slightly taller to reduce inner scrolling
- Add `w-[95vw]` so on narrower viewports it gracefully shrinks with padding

This is a single-line CSS change — no structural or logic modifications needed.
