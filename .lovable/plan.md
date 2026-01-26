

# Move "Add System" Button to Top Row

## Overview
Relocate the "Add System" button from the bottom-right position to the top row of the Systems tab, aligning it with the statistics cards for better visibility and consistency with the Training tab pattern.

## Current State
- Button is positioned at the bottom right of the systems list
- Requires scrolling to access when many systems are present
- Inconsistent with the Training tab which has action button at top

## Implementation

### Changes to `VCRSystemsTab.tsx`

1. **Remove bottom button section** (lines 253-263)
   - Delete the wrapper div containing the "Add System" button at the bottom

2. **Add button to stats row** (around line 167)
   - Modify the grid layout to accommodate the button
   - Position button as the last item in the stats row
   - Style consistently with Training tab's "Add Training" button

### Updated Layout Structure
```text
┌─────────────────────────────────────────────────────────────────────────┐
│ [Total Systems] [RFO Achieved] [RFSU Achieved] [Punchlists] [+Add System]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  System Cards List...                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technical Details

**Stats Row Modification:**
- Change grid from `grid-cols-2 md:grid-cols-4` to a flex layout with `flex-wrap`
- Add the button as a flex item aligned to the right
- Use `ml-auto` to push button to the end of the row

**Button Styling:**
- Keep current outline variant and size="sm"
- Maintain the Plus icon and "Add System" text
- Match the gap-2 spacing pattern

## Outcome
- Immediate visibility of the action button
- Consistent UI pattern with Training tab
- Better user experience without scrolling to find actions

