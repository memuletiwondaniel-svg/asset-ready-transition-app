

## Fix: PDF Clarity, Scroll, Draggable Annotations, Text Box Drawing, and Signature Tool

### Issues to Address

1. **PDF still blurry** — CSS `scale()` on the container causes interpolation blur. Fix: render the PDF at `width = 900 * zoom` directly (no CSS transform), so react-pdf renders at the actual target resolution.

2. **Scroll broken when zoomed** — Because `scale()` doesn't change the element's layout size, the scrollable container doesn't know the true rendered dimensions. Removing CSS `scale()` in favor of direct width rendering fixes this automatically.

3. **Text box needs arrow/callout** — Add a leader line from the text box to a target point. When the text_box tool is active, the user drags to draw a rectangle (like Acrobat), then types content. Store an `anchor` point in position_data for the arrow tip.

4. **Draggable annotations** — Make comment pins, text boxes, stamps, and signatures draggable (pointer tool mode). On drag end, update `position_data` via `updateAnnotation`.

5. **Signature tool** — Add a new `signature` annotation type and tool. On click, show a signature pad modal (draw or select from saved). Place the signature as a draggable image on the document.

### Changes

#### 1. `DocumentCanvas.tsx` — Fix blur and scroll
- Remove `style={{ transform: scale(${zoom}) }}` wrapper
- Pass `width={Math.round(900 * zoom)}` directly to `<Page>`
- This renders the PDF at the correct resolution and the overflow container scrolls naturally

#### 2. `AnnotationLayer.tsx` — Major enhancements
- **Draggable annotations**: In pointer mode, allow mousedown+drag on comment_pin, text_box, stamp, signature annotations. Track drag offset and update position on mouseup via a new `onUpdateAnnotation` prop.
- **Text box drawing**: When `text_box` tool is active, user drags to draw a rectangle (mousedown→mousemove→mouseup like highlight). Show preview rect while dragging. On mouseup, prompt for text content. Store `anchor` point (the mousedown position) for a leader/arrow line.
- **Text box arrow rendering**: Render an SVG line from `position_data.anchor` to the text box corner.
- **Signature placement**: When `signature` tool is active, clicking opens a signature pad dialog. On completion, place signature at click position as a draggable element.

#### 3. `AnnotationToolbar.tsx` — Add Signature tool
- Add `{ mode: 'signature', icon: PenTool, label: 'Signature' }` to TOOLS array
- Update `ToolMode` type to include `'signature'`

#### 4. `useAttachmentCollaboration.ts` — Update types
- Add `'signature'` to `AnnotationType` union
- Add optional `anchor`, `signatureData` fields to `position_data` interface

#### 5. New: `SignaturePadDialog.tsx`
- Modal with a canvas for drawing a signature (or selecting a previously saved one from localStorage)
- Returns base64 image data on confirm
- Clean, minimal UI with Clear/Save/Cancel buttons

### Technical Details

**Blur fix** (critical change in `DocumentCanvas.tsx`):
```
// Before (blurry):
<div style={{ transform: `scale(${zoom})` }}>
  <Page width={900} />
</div>

// After (sharp):
<div>
  <Page width={Math.round(900 * zoom)} />
</div>
```

**Drag logic** (in `AnnotationLayer.tsx`):
- In pointer mode, mousedown on an annotation starts drag tracking
- mousemove updates a local offset state (visual feedback)
- mouseup calls `onUpdateAnnotation({ id, position_data: { ...pos, x: newX, y: newY } })`

**Text box drawing UX**:
- Drag to define rectangle (same as highlight preview)
- On release, show text input prompt
- Render with SVG arrow from anchor point to nearest box corner

**Signature flow**:
- Click document → open SignaturePadDialog
- Draw or select saved signature → confirm
- Place as annotation with `signatureData` (base64) in position_data
- Render as `<img>` element, draggable in pointer mode

### Files to Edit
1. `src/components/document-collaboration/DocumentCanvas.tsx`
2. `src/components/document-collaboration/AnnotationLayer.tsx`
3. `src/components/document-collaboration/AnnotationToolbar.tsx`
4. `src/hooks/useAttachmentCollaboration.ts`
5. `src/components/document-collaboration/DocumentViewerOverlay.tsx` (pass updateAnnotation to AnnotationLayer)
6. **New**: `src/components/document-collaboration/SignaturePadDialog.tsx`

