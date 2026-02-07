

# "Show Mapping" Connection Diagram Feature

## Overview
Add a toggle button to the workspace header that, when activated, renders a clean SVG connection diagram showing the relationships between Systems (left panel), VCRs, and Phases. The connections will be methodically routed using smooth bezier curves, color-coded by VCR, with anti-spaghetti measures including smart system reordering and visual separation.

## How It Works

When the user clicks "Show Mapping":
1. Systems in the left panel are automatically re-sorted by their VCR assignment (grouped by VCR), minimizing line crossings
2. An SVG overlay appears on top of the workspace drawing smooth, color-coded bezier curves from each system card to its assigned VCR card
3. Unassigned systems are dimmed to reduce visual noise
4. Each connection uses the VCR's pastel color for instant identification
5. Clicking "Show Mapping" again hides the overlay and restores normal system ordering

## Visual Design
- Connections are smooth cubic bezier curves that exit horizontally from the right edge of system cards and curve into the left edge of VCR cards
- Lines are semi-transparent (opacity 0.6) with a slightly thicker stroke (2px) and rounded ends
- VCR cards get a subtle glow/ring matching their color when mapping is active
- Unassigned systems get reduced opacity (0.4) when mapping is visible
- A small animated dot or gradient pulse along each line for polish (optional, via CSS animation on stroke-dashoffset)

## Anti-Spaghetti Measures
1. **System reordering**: When mapping mode is active, systems in the left panel are sorted by their assigned VCR's vertical position in the workspace, grouping all systems for the same VCR together -- this naturally aligns the connection source points
2. **Bezier curve routing**: Curves use a horizontal offset proportional to their index within a group, preventing overlapping lines
3. **Color coding**: Each VCR's connections use its unique pastel color from the existing `getVCRColor()` utility
4. **Grouping labels**: Small VCR name labels appear next to system groups in the panel when mapping is active

## Technical Details

### New Files
1. **`src/components/p2a-workspace/mapping/MappingOverlay.tsx`** -- The SVG overlay component
   - Uses `useRef` + `useEffect` + `ResizeObserver` to track DOM positions of system cards and VCR cards
   - Renders an absolutely-positioned SVG spanning the full workspace
   - Draws cubic bezier paths: `M startX,startY C cp1X,cp1Y cp2X,cp2Y endX,endY`
   - Each path uses stroke color from `getVCRColor(vcrCode)`
   - Implements a `getBezierPath()` utility that calculates control points to create smooth S-curves with enough horizontal spread to avoid overlap

2. **`src/components/p2a-workspace/mapping/useMappingPositions.ts`** -- Hook to compute element positions
   - Uses `data-system-id` and `data-vcr-id` DOM attributes to locate cards
   - Recalculates on scroll, resize, and when mapping mode toggles
   - Returns an array of `{ systemRect, vcrRect, vcrColor, vcrCode }` for each connection

### Modified Files
3. **`P2AHandoverWorkspace.tsx`** -- Add mapping state and toggle
   - Add `const [showMapping, setShowMapping] = useState(false)`
   - Pass `showMapping` to `SystemsPanel` (for reordering) and render `MappingOverlay` when active
   - Add a `data-workspace-root` ref on the main container for the overlay to position against

4. **`P2AWorkspaceOverlay.tsx`** -- Add "Show Mapping" button to the header bar
   - New toggle button between the status badge and X button
   - Uses `GitMerge` or `Cable` icon from lucide-react
   - Active state: filled background with primary color accent
   - Pass toggle state down to `P2AHandoverWorkspace`

5. **`SystemsPanel.tsx`** -- Support mapping-mode reordering
   - Accept `showMapping` prop
   - When active, sort the assigned/unassigned system lists by VCR position (grouped by VCR, ordered by VCR's Y position in their phase)
   - Add `data-system-id={system.id}` attributes to each system card wrapper for DOM position lookup
   - Dim unassigned systems (opacity-40) when mapping is visible

6. **`SystemCard.tsx`** / **`DraggableSystemCard.tsx`** -- Add data attributes
   - Add `data-system-id` to the card root for position tracking

7. **`HandoverPointCard.tsx`** / **`DraggableHandoverPointCard.tsx`** -- Add data attributes
   - Add `data-vcr-id` to the card root for position tracking

### Bezier Routing Algorithm
```text
For each connection (system -> VCR):
  1. Get system card's right-center point (startX, startY)
  2. Get VCR card's left-center point (endX, endY)
  3. Calculate horizontal midpoint: midX = startX + (endX - startX) * 0.5
  4. Add vertical offset based on connection index within group to stagger curves
  5. Control point 1: (midX, startY)
  6. Control point 2: (midX, endY)
  7. Result: smooth S-curve that fans out horizontally and converges at VCR
```

### Performance Considerations
- SVG overlay uses `pointer-events: none` so it doesn't interfere with drag-and-drop or clicks
- Position calculations are debounced on scroll/resize (100ms)
- Only active when `showMapping` is true (zero overhead when off)
- Uses CSS `will-change: transform` on the SVG for GPU compositing

