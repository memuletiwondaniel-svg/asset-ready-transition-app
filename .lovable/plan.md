

## Vertical-Only Zoom for P2A Workspace

### Current Behavior
The workspace zoom (`--ws-zoom`) scales all card dimensions uniformly -- width, height, padding, and font sizes all shrink/grow together.

### New Behavior
- **Width stays fixed** at 140px regardless of zoom level
- **Height compresses** as you zoom out -- padding, vertical gaps, and font sizes shrink
- **At low zoom levels** (e.g. below 0.8), the secondary info row (System ID + percentage, VCR code + percentage) is hidden entirely, leaving only the name visible
- This allows fitting many more cards vertically without sacrificing horizontal readability

### Technical Approach

Introduce a second CSS variable `--ws-zoom-y` alongside the existing `--ws-zoom`. The workspace container will set `--ws-zoom` to 1 (constant) for horizontal dimensions and `--ws-zoom-y` to the actual zoom level for vertical dimensions.

**Files to modify:**

1. **`P2AHandoverWorkspace.tsx`** -- Set two CSS variables on the workspace container:
   - `--ws-zoom: 1` (width stays constant)
   - `--ws-zoom-y: {zoomLevel}` (height scales)

2. **`SystemCard.tsx`** -- Change vertical-sensitive properties to use `--ws-zoom-y`:
   - `width` keeps using `--ws-zoom` (stays fixed)
   - `padding`, vertical `gap`, `height` (placeholder), icon sizes use `--ws-zoom-y`
   - Font sizes use `--ws-zoom-y`
   - Hide the system ID + percentage row when `zoomLevel < 0.8` (via a `--ws-zoom-hide-ids` CSS variable or a direct prop)

3. **`SubsystemCard.tsx`** -- Same pattern as SystemCard

4. **`HandoverPointCard.tsx`** -- Same pattern: fixed width, vertical compression, hide VCR code row at low zoom

5. **`SystemsPanel.tsx`** -- Vertical gaps between cards use `--ws-zoom-y`

6. **`P2AWorkspaceOverlay.tsx`** -- Extend zoom range downward (e.g. minimum 0.4 instead of 0.6) to allow more extreme compression. Also pass `zoomLevel` so components can conditionally hide IDs.

### Zoom-to-Hide Logic

Rather than complex CSS-only detection, the workspace container will set a data attribute `data-hide-ids` when zoomLevel drops below 0.8. Card components will check this via a prop or CSS:

```text
Zoom >= 0.8:  [Name]
              [ID ............. %]

Zoom < 0.8:   [Name]
              (ID row hidden)
```

### Summary of Changes

| File | Change |
|------|--------|
| `P2AWorkspaceOverlay.tsx` | Lower min zoom to 0.4, keep step at 0.1 |
| `P2AHandoverWorkspace.tsx` | Set `--ws-zoom: 1` and `--ws-zoom-y: zoomLevel` and `data-hide-ids` attribute |
| `SystemCard.tsx` | Width uses `--ws-zoom`, vertical dims use `--ws-zoom-y`, conditionally hide ID row |
| `SubsystemCard.tsx` | Same vertical-only zoom pattern |
| `HandoverPointCard.tsx` | Same vertical-only zoom pattern, hide VCR code at low zoom |
| `SystemsPanel.tsx` | Gaps use `--ws-zoom-y` |

