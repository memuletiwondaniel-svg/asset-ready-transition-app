## Issue
`PSSRSummaryWidget` (P2A Handover card) uses `hover:scale-[1.02] hover:shadow-lg hover:border-red-500/20` on the root `<Card>`, which scales the card on hover and pushes it beyond the grid frame (the red overflow shown in the screenshot). The `ORPActivityPlanWidget` (ORA Activities card) has no scale transform — just the subtle `transition-all duration-300 group` setup.

## Fix
In `src/components/widgets/PSSRSummaryWidget.tsx`, change the `<Card>` className from:
```
h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-red-500/20 group
```
to match ORA Activities exactly:
```
h-full flex flex-col transition-all duration-300 group overflow-hidden
```

This removes the scale-on-hover (root cause of the overflow) and the red border tint, keeping the card within its grid cell while preserving the same hover-driven reveal behavior used by the ORA card (CTA opacity, status badge opacity, etc., which rely on `group-hover`).

No other files need changes.