

## Fix: Document Viewer Overlay Z-Index, Width, and Collapsible Comments

### Issues
1. **Overlay behind task detail**: The `DocumentViewerOverlay` Dialog renders at default z-index, which is below the task detail sheet (z-150+).
2. **Width constrained**: The dialog uses `max-w-[98vw]` but the comments sidebar always takes space, leaving the document canvas cramped.
3. **Comments not collapsible**: The sidebar is always visible with no way to collapse it.

### Changes

#### 1. `src/components/document-collaboration/DocumentViewerOverlay.tsx`
- Add `!z-[200]` to the `DialogContent` className (per the project's layering standards — detail overlays use z-200).
- Add state `commentsOpen` (default `true`) with a toggle button in the top bar.
- Pass `commentsOpen` to conditionally render/hide `CommentsSidebar`.
- When comments are collapsed, the document canvas gets full width.

#### 2. `src/components/document-collaboration/CommentsSidebar.tsx`
- Wrap the sidebar in a container that supports width transition (e.g., `w-80` when open, `w-0 overflow-hidden` when closed).
- Or simply conditionally render based on a prop `isOpen`.

### Implementation Detail

**DocumentViewerOverlay.tsx:**
- Add `const [commentsOpen, setCommentsOpen] = useState(true);`
- DialogContent: change className to include `!z-[200]`
- Add toggle button (MessageCircle icon) in the top bar actions
- Conditionally render `CommentsSidebar` based on `commentsOpen`

**CommentsSidebar.tsx:**
- No changes needed if we conditionally render. Alternatively, add an `isOpen` prop with animated width transition for a smoother UX.

