

## Plan: Fix Comment Filters, Mobile Touch Support, Reply UX

### Issues Identified

1. **Comment filter** only supports "All" vs "Unresolved". Missing filter by annotation type and by user. Also `signature` missing from `ANNOTATION_TYPE_LABELS`.

2. **SignaturePadDialog not mobile-responsive**: Canvas only has mouse events (no touch). Dialog content overflows on small screens. Tabs and buttons are inaccessible.

3. **Annotation tools don't work on mobile**: `AnnotationLayer` uses only `onMouseDown/Move/Up` — no touch event handlers. All drawing, text box, stamp, signature, and drag interactions are broken on touch devices.

4. **Reply to comments**: Reply input only appears when an annotation is selected (clicked). This works but is not obvious. Will make the reply input always visible with a "Reply" toggle button so any reviewer can reply without needing to know to click the annotation first.

5. **Comments UX recommendation**: Adobe Acrobat-style inline commenting (current approach) is the modern enterprise SaaS standard — no change needed to the overall pattern.

### Changes

#### 1. `CommentsSidebar.tsx` — Enhanced filters + reply UX
- Add filter options: by annotation type (`highlight`, `comment_pin`, `text_box`, `drawing`, `stamp`, `signature`) and by user
- Add `signature` to `ANNOTATION_TYPE_LABELS`
- Use a popover/dropdown with checkboxes for multi-select filtering (type + user)
- Show reply input with a small "Reply" button on each annotation (not only when selected), so any reviewer can reply without selecting first

#### 2. `SignaturePadDialog.tsx` — Mobile responsive + touch events
- Add `onTouchStart/Move/End` handlers to canvas (mirror mouse handlers with `e.touches[0]`)
- Make dialog responsive: `max-w-[95vw] sm:max-w-md`, reduce canvas height on mobile
- Ensure tabs and buttons are tappable with adequate touch targets

#### 3. `AnnotationLayer.tsx` — Touch event support
- Add `onTouchStart`, `onTouchMove`, `onTouchEnd` handlers on the layer div that convert touch coordinates to the same logic as mouse handlers
- Apply to: highlight drawing, text box drawing, pen drawing, stamp placement, signature placement, annotation dragging, resizing, anchor dragging
- Use `e.touches[0].clientX/clientY` mapped through `getRelativePos`

#### 4. `AnnotationToolbar.tsx` — Mobile layout
- On mobile (`md:` breakpoint), switch toolbar to horizontal layout at the bottom or make it scrollable so all tools are accessible on small screens

### Files to modify
1. `src/components/document-collaboration/CommentsSidebar.tsx`
2. `src/components/document-collaboration/SignaturePadDialog.tsx`
3. `src/components/document-collaboration/AnnotationLayer.tsx`
4. `src/components/document-collaboration/AnnotationToolbar.tsx`

