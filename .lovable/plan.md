

## Fix: Document Viewer Width, Backdrop, PDF Clarity, and Presence Display

### Issues Identified

1. **Task detail not dimmed**: The Dialog's backdrop overlay renders at `z-50` (from `dialog.tsx`), but the task detail sheet also renders at high z-index. The backdrop needs to match the document viewer's `z-[200]` level to properly dim everything behind it.

2. **PDF blurriness**: The PDF `Page` component renders at `width={700}` and then CSS `scale()` is applied for zoom. CSS scaling causes blurriness — instead, the rendered width should be larger (e.g., 900px) for crisper text at 1x zoom.

3. **Width slightly too wide**: Reduce from `99vw` to `96vw` for a cleaner look with some breathing room.

4. **Collaborator avatars not visible enough**: The `CollaboratorPresence` component exists in the status bar but is small. Move/duplicate the online users display into the top header bar next to the file name for better visibility.

### Changes

#### 1. `src/components/document-collaboration/DocumentViewerOverlay.tsx`
- Reduce dialog width from `99vw` to `96vw`, adjust left offset accordingly
- Add a custom high-z-index backdrop by using a `DialogOverlay` override or an additional overlay div at `z-[199]` before the dialog content
- Show online user avatars in the top bar (between file name and action buttons)

#### 2. `src/components/document-collaboration/DocumentCanvas.tsx`
- Increase PDF `Page` width from `700` to `900` for sharper rendering at default zoom

#### 3. `src/components/ui/dialog.tsx` (or inline in DocumentViewerOverlay)
- The cleanest approach: render a manual overlay div inside the Dialog portal at `z-[199]` with `bg-black/80` to ensure it covers everything including the task detail sheet. Alternatively, pass a custom className to DialogOverlay.

### Regarding Adobe Cloud Sync

No — changes made in Adobe Acrobat (or any external tool) do **not** automatically sync back into the ORSH collaborative viewer. The document stored in Supabase Storage is a static uploaded file. To reflect external edits, the user would need to re-upload the modified file. This is a fundamental limitation since there is no integration with Adobe Cloud APIs.

### Scope
3 files: `DocumentViewerOverlay.tsx`, `DocumentCanvas.tsx`, and potentially `dialog.tsx` or an inline overlay element.

