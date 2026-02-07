

## Fix: Enable Scrolling in the Systems Panel

### Problem
The Systems Panel clips content that extends beyond the visible area, making it impossible to scroll down to see all systems and subsystems (e.g., subsystem `C017-DP300-403-04`). The scrollbar does not appear even though a `ScrollArea` component is used.

### Root Cause
There are CSS overflow constraints at multiple levels that prevent Radix ScrollArea from correctly detecting scrollable content and rendering a scrollbar:

1. **`ScrollArea` has `overflow-hidden`** (line 309) -- this is redundant because `ScrollArea` already handles overflow internally. Adding `overflow-hidden` on the root element can interfere with Radix's scroll measurement.
2. **`CollapsibleContent` has `overflow-hidden`** (line 89) -- the unassigned section's collapsible clips its children, preventing proper height calculation.

### Fix (2 changes in `SystemsPanel.tsx`)

1. **Remove `overflow-hidden` from the `ScrollArea` wrapper** (line 309)
   - Change: `className="flex-1 min-h-0 overflow-hidden"` to `className="flex-1 min-h-0"`
   - The `ScrollArea` component already manages overflow internally through `@radix-ui/react-scroll-area`. The extra `overflow-hidden` on the root prevents proper scroll behavior.

2. **Remove `overflow-hidden` from `CollapsibleContent`** (line 89)
   - Change: `className="pt-2 overflow-hidden"` to `className="pt-2"`
   - This ensures the unassigned section's content isn't clipped and contributes to the correct scrollable height.

### Expected Result
After these changes, the Systems Panel will show a scrollbar when the list of systems and subsystems exceeds the visible area. You will be able to scroll down to see all items including `C017-DP300-403-04` (the Gas Compressors subsystem mapped to VCR-DP300-006).

