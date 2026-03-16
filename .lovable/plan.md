

## Fix: Signature DB Enum, Text Box Arrow/Resize, Drag Smoothness, Scroll, Layout, Colors

### Root Causes Identified

1. **Signature error**: The DB enum `annotation_type` only has `('highlight', 'comment_pin', 'text_box', 'drawing', 'stamp')` — missing `'signature'`. Need a migration to add it.

2. **Drag bouncing**: After drag ends, the component re-renders with stale data from the query cache before the mutation completes. Fix: use optimistic local state — keep `dragOffset` applied until the mutation response arrives and the query invalidates.

3. **Text box lacks arrow**: The arrow SVG exists in code but the anchor point is set to `textBoxDraw.start` which is the same corner as the box. The anchor should be a separate user-set point. Simpler fix: always draw the arrow from the anchor (drag start) to the nearest edge of the text box, and ensure the anchor differs from the box position.

4. **Text box not resizable**: No resize handles exist. Add corner/edge drag handles that update `width`/`height` in `position_data`.

5. **Scroll still broken**: The PDF container `items-center` class centers content, preventing left-scroll when zoomed. Remove `items-center` from the scroll container so the document starts at the left edge and scrolls naturally.

6. **Colors in toolbar**: Currently shown as individual dots — this is already the better UX pattern (show all colors). The current implementation is fine.

7. **Layout**: Reduce width to `92vw`, use CSS centering (`left-1/2 -translate-x-1/2, top-1/2 -translate-y-1/2`) for proper vertical and horizontal centering.

### Changes

#### 1. New SQL Migration — Add `signature` to enum
```sql
ALTER TYPE public.annotation_type ADD VALUE IF NOT EXISTS 'signature';
```

#### 2. `DocumentCanvas.tsx` — Fix scroll
- Remove `items-center` from the PDF scroll container so content starts at top-left and scrolls bidirectionally when zoomed.

#### 3. `DocumentViewerOverlay.tsx` — Layout centering
- Change to `!w-[92vw] !max-w-[92vw] !h-[92vh]` with `!left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2` for true centering.

#### 4. `AnnotationLayer.tsx` — Multiple enhancements
- **Drag smoothness**: After `onUpdateAnnotation` call on mouseup, keep the visual offset until the annotation data refreshes (use a `recentlyDragged` map to avoid snap-back).
- **Text box arrow**: Change anchor logic so the arrow points from the drag-start point to the text box edge. The drag-start is the "target" and the box is drawn offset from it.
- **Text box resize handles**: When selected in pointer mode, show 4 corner handles. Dragging a handle updates `width`/`height` in position_data.
- **Signature resize**: Same resize handles for signature annotations.

#### 5. `AnnotationToolbar.tsx` — Colors already visible
No change needed — all 6 colors are already displayed as dots.

### Files
1. New migration SQL (add `signature` to enum)
2. `DocumentCanvas.tsx` (fix scroll centering)
3. `DocumentViewerOverlay.tsx` (layout sizing/centering)
4. `AnnotationLayer.tsx` (drag smoothness, text box arrow fix, resize handles)

