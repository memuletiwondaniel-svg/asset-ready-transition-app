
# Plan: Enhance PSSR Review Cards Visual Distinction

## Overview
The current PSSR review cards in the My Tasks dashboard lack visual differentiation, making it difficult to quickly scan and prioritize reviews. This plan introduces a multi-layered visual system that provides instant recognition of key attributes while maintaining a clean, professional appearance.

## Current Issues
- All cards share identical `bg-background/50` styling
- Only differentiation is the "days pending" badge color
- No visual indication of asset/plant location
- Item count lacks emphasis for high-volume reviews
- Approver role has no visual distinction

---

## Visual Enhancement Strategy

### 1. Asset/Plant Color-Coded Left Border
Add a colored left border based on the asset location to instantly identify which plant/facility the PSSR belongs to:

| Asset | Color | Tailwind Classes |
|-------|-------|------------------|
| Hammar Mishrif (HM) | Cyan | `border-l-cyan-500` |
| Majnoon | Purple | `border-l-purple-500` |
| Rumaila | Blue | `border-l-blue-500` |
| CS3/4 | Teal | `border-l-teal-500` |
| CS6/7 | Indigo | `border-l-indigo-500` |
| NRNGL | Pink | `border-l-pink-500` |
| Default | Slate | `border-l-slate-400` |

### 2. Urgency-Based Background Tinting
Apply subtle background tints based on how long the item has been pending:

| Days Pending | Visual Treatment |
|--------------|------------------|
| 7+ days (Overdue) | `bg-destructive/5` with subtle red glow |
| 3-6 days (Approaching) | `bg-amber-500/5` |
| 0-2 days (Fresh) | Default `bg-background/50` |

### 3. Item Count Emphasis Badge
Transform the item count display into a visually prominent badge for high-volume reviews:

| Item Count | Treatment |
|------------|-----------|
| 10+ items | Bold badge with `bg-primary/10 text-primary` |
| 5-9 items | Subtle emphasis badge |
| 1-4 items | Standard text display |

### 4. Approver Role Icon System
Add small icons before the approver role text for quick visual scanning:

| Role Contains | Icon |
|---------------|------|
| "Director" | Shield icon |
| "Technical Authority" / "TA" | Wrench icon |
| "HSE" | AlertTriangle icon |
| "Operations" | Settings icon |
| Default | User icon |

### 5. Asset Badge Component
Add a small colored asset badge next to the project name for additional context:

```text
PSSR-DP300-001                    [NEW]
HM Additional Compressors  [HM]
12 items • P&M Director SoF
```

---

## Technical Implementation

### Files to Create
1. **`src/utils/assetColors.ts`** - Asset color mapping utility with functions:
   - `getAssetColor(asset: string)` - Returns border and background classes
   - `getAssetAbbreviation(asset: string)` - Returns short code (HM, MJ, RM, etc.)

### Files to Modify
1. **`src/components/tasks/PSSRReviewsPanel.tsx`**
   - Import new asset color utility
   - Add urgency background logic based on `daysPending`
   - Add asset color border styling
   - Enhance item count display with conditional badge
   - Add role icon mapping
   - Add asset abbreviation badge

2. **`src/hooks/useMyTasksMockData.ts`**
   - Ensure mock data includes varied assets for testing the color system

---

## Visual Mockup (Before/After)

```text
BEFORE:
┌─────────────────────────────────────────┐
│ PSSR-DP300-001                  [2d ago]│
│ HM Additional Compressors               │
│ 12 items • P&M Director SoF    [Review] │
└─────────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────────┐
│▌PSSR-DP300-001             [NEW][2d ago]│
│▌HM Additional Compressors      [HM]     │
│▌🔧 12 items • 🛡️ P&M Director   [Review] │
└─────────────────────────────────────────┘
 ↑ Cyan border indicates Hammar Mishrif asset
```

```text
OVERDUE EXAMPLE (8+ days):
┌─────────────────────────────────────────┐
│▌PSSR-DP290-001               [8d ago] ⚠ │  ← Red background tint
│▌Rumaila Flare Gas Recovery      [RM]    │
│▌⚡ 15 items • 🛡️ P&M Director   [Review] │  ← High item count emphasis
└─────────────────────────────────────────┘
 ↑ Blue border indicates Rumaila asset
```

---

## Implementation Steps

1. Create `src/utils/assetColors.ts` with color mapping
2. Update `PSSRReviewsPanel.tsx`:
   - Import utilities and icons
   - Add `getUrgencyBackground()` helper function
   - Add `getRoleIcon()` helper function  
   - Modify card container classes for asset border + urgency background
   - Add asset abbreviation badge component
   - Enhance item count with conditional styling
3. Verify mock data has diverse assets
4. Test across light/dark modes

---

## Accessibility Considerations
- Color is never the sole indicator; icons and text provide redundant information
- Contrast ratios maintained for all color combinations
- Border widths (3px) are visible to color-blind users
- Badge text provides explicit context

