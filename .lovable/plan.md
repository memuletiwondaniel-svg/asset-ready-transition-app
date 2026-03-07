

## Plan: Default completed collapsed & fix default widget order

### Changes

#### 1. `src/components/widgets/ORPActivityPlanWidget.tsx` (line 86)
- Change `completedOpen` default from `true` to `false`

#### 2. `src/pages/ProjectDetailsPage.tsx` (line 81)
- Change default widget order from `['orp', 'pssr']` to `['orp', 'pssr']` — this is already correct (ORA Activities first, then PSSR/P2A). No change needed here since the Project Overview is in the left column and not part of the draggable order.

Actually the default is already `['orp', 'pssr']` which means ORA Activities comes before P2A. The Project Overview is fixed in the left column. So only change needed is the `completedOpen` default.

### Files to modify
- `src/components/widgets/ORPActivityPlanWidget.tsx` — line 86: change `useState(true)` to `useState(false)`

