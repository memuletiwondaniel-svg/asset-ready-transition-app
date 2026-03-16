

## Fix: Cursor UX, Arrow Tip Dragging, Text Box Styling, and Resize Handles

### Changes to `AnnotationLayer.tsx`

#### 1. Cursor behavior
- **Signature & Text box body**: Show `cursor-grab` (hand) when hovering in pointer mode, `cursor-grabbing` while dragging. Already partially implemented but needs to work even without the pointer tool active — any time hovering over a placed annotation.
- **Text box & signature edges**: Show directional resize cursors (`nwse-resize`, `nesw-resize`, `ew-resize`, `ns-resize`) when hovering near the border/edge. Currently resize handles only appear on selection — instead, show edge resize cursors on hover by adding invisible edge zones around the border.

#### 2. Arrow tip is independent and draggable
Current issue: The arrow's anchor moves with the text box when dragged (lines 200-205). The anchor (arrow tip) should be independently draggable.

**Fix**:
- When dragging the text box, do NOT move the anchor — remove the anchor-offset logic from `handleMouseUp`.
- Add a draggable arrow-tip handle (a small circle at the anchor position) visible when the text box is selected in pointer mode.
- New state: `draggingAnchor` — tracks mousedown on the arrow tip handle, mousemove updates anchor position, mouseup calls `onUpdateAnnotation` with new anchor coordinates.
- The arrow always renders from `anchor` to the nearest edge of the text box.

#### 3. Text box creation flow — arrow always visible
Current issue: The text box is placed offset from the drawn area (`boxX = x + w + 2`), making the arrow confusing. 

**Fix**: Place the text box where the user drew it. Set the anchor to a point extending outward from the center-left of the box (e.g., `anchor = { x: x - 5, y: y + h/2 }`). This ensures the arrow is always visible protruding from the box by default. The user can then drag the arrow tip to point wherever they want.

#### 4. Text box font color
Modern SaaS convention: Use a distinct but professional color for annotation text. Set text box content to render in the annotation's selected color (e.g., `style={{ color: ann.color }}`), with slightly bolder weight (`font-medium`). This differentiates annotation text from document text without being garish.

#### 5. Resize handles — edge-based cursors
Replace corner-only resize dots with invisible edge zones that show proper resize cursors:
- Top/bottom edges: `cursor-ns-resize`
- Left/right edges: `cursor-ew-resize`  
- Corners: `cursor-nwse-resize` / `cursor-nesw-resize`

These edge zones render on hover (not just when selected) for text_box and signature annotations.

### Summary of changes

**File**: `src/components/document-collaboration/AnnotationLayer.tsx`
- Add `draggingAnchor` state for independent arrow tip dragging
- Remove anchor co-movement from text box drag logic
- Add draggable arrow tip circle handle when text box is selected
- Update text box creation to place arrow tip offset from box edge
- Add edge resize zones with proper directional cursors
- Set text box content color to `ann.color` with `font-medium`
- Ensure signature always shows `cursor-grab` on hover

