# Plan: Move Key Activities from Progress Widget to Overview Widget

## Objective
Move the "Key Activities" section from `PSSRChecklistProgressWidget` to `OverviewStatsWidget` to consolidate activity-related information in the Overview widget.

## Files to Modify

### 1. `src/components/widgets/OverviewStatsWidget.tsx`

**Add KeyActivity interface and props:**
```tsx
// Add after LinkedPSSR interface (around line 13)
interface KeyActivity {
  name: string;
  status: 'Completed' | 'Scheduled' | 'Not Scheduled';
  date?: string;
  attendees?: number;
  type?: string;
}

// Update OverviewStatsWidgetProps interface:
interface OverviewStatsWidgetProps {
  linkedPSSRs?: LinkedPSSR[];
  onPSSRClick?: (pssrId: string) => void;
  keyActivities?: KeyActivity[];           // NEW
  onActivityClick?: (type: string) => void; // NEW
}
```

**Add KeyActivityItem component** (copy from PSSRChecklistProgressWidget):
- Copy the `KeyActivityItem` component (lines 165-219)
- Copy the required icons: `CheckCircle2`, `Clock`, `AlertCircle`, `Calendar` (already has most)

**Add Key Activities section to the render:**
- Add a new collapsible section similar to "Linked PSSRs" for Key Activities
- Place it after the stats cards, before or alongside the Linked PSSRs section

### 2. `src/components/widgets/PSSRChecklistProgressWidget.tsx`

**Remove Key Activities section:**
- Remove the `KeyActivity` interface (lines 27-33) - or keep if used elsewhere
- Remove `keyActivities` and `onActivityClick` from props interface (lines 48, 54)
- Remove `keyActivities` and `onActivityClick` from destructured props (lines 230, 234)
- Remove the `KeyActivityItem` component (lines 165-219)
- Remove the Key Activities render section (lines 357-378)
- Adjust widget height since content is reduced

### 3. `src/components/PSSRDashboard.tsx`

**Update widget props:**
- Remove `keyActivities` and `onActivityClick` from `PSSRChecklistProgressWidget` (line 546, 550)
- Add `keyActivities` and `onActivityClick` to `OverviewStatsWidget` (around line 568-571)

```tsx
// Change from:
<OverviewStatsWidget
  linkedPSSRs={pssrData.linkedPSSRs}
  onPSSRClick={(id) => console.log('PSSR clicked:', id)}
/>

// Change to:
<OverviewStatsWidget
  linkedPSSRs={pssrData.linkedPSSRs}
  onPSSRClick={(id) => console.log('PSSR clicked:', id)}
  keyActivities={pssrData.keyActivities}
  onActivityClick={handleActivityClick}
/>
```

## UI Design for Key Activities in Overview Widget

The Key Activities section will be displayed as a collapsible section with:
- A header with an icon (Calendar), label "Key Activities", badge with count, and chevron
- When expanded, shows activity items with:
  - Status icon (checkmark for Completed, clock for Scheduled, alert for Not Scheduled)
  - Activity name
  - Date (if available)
  - Status badge

## Expected Result
- Key Activities will appear in the Overview widget alongside Linked PSSRs
- The Progress widget will be smaller/cleaner, focusing only on progress metrics
- All activity-related functionality (click handlers, modals) will continue to work as before
