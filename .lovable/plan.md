

## Live Document Collaboration on Task Attachments

### Overview

When a user clicks an attachment, instead of downloading or opening in a new tab, a full-screen overlay opens within the ORSH app showing the document with collaborative annotation tools. All annotations, comments, and markup are stored in Supabase and synced in real-time across users.

### Architecture

```text
┌─────────────────────────────────────────────────────┐
│  DocumentViewerOverlay (full-screen modal)          │
│  ┌──────────┬──────────────────────┬──────────────┐ │
│  │ Toolbar  │                      │  Comments    │ │
│  │ ─────── │   Document Canvas     │  Panel       │ │
│  │ Highlight│   (PDF / Image /     │  ─────────── │ │
│  │ Comment  │    Office preview)   │  Thread 1    │ │
│  │ Text Box │                      │  Thread 2    │ │
│  │ Drawing  │   ← Annotation      │  ...         │ │
│  │ Stamp    │      Layer overlay → │              │ │
│  │ ─────── │                      │  + Add       │ │
│  │ Users    │                      │              │ │
│  │ Online   │                      │              │ │
│  └──────────┴──────────────────────┴──────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Status bar: Save status │ Version │ Online users│ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Document Rendering Strategy

| File Type | Rendering Approach |
|---|---|
| **PDF** | `react-pdf` (pdfjs-dist) — page-by-page rendering on canvas with annotation overlay |
| **Images** (PNG, JPG) | Native `<img>` with annotation overlay div |
| **Office docs** (DOCX, XLSX, PPTX) | Microsoft Office Online viewer via iframe (`https://view.officeapps.live.com/op/embed.aspx?src=<public_url>`) with annotation overlay on top |
| **Other** | Download fallback with preview unavailable message |

### Annotation System

Annotations are stored per-attachment in a new `attachment_annotations` table. Each annotation has a type, position (relative coordinates for resolution-independence), content, and author. Types include:

- **Highlight** — rectangular region with semi-transparent color
- **Comment pin** — positioned marker linked to a comment thread
- **Text box** — free-text placed at a coordinate
- **Drawing** — freehand SVG path overlay
- **Stamp** — predefined labels (Approved, Rejected, For Review, etc.)

### Real-Time Collaboration

Uses Supabase Realtime channels (same pattern as existing `useTaskDocument.ts`):
- Channel per attachment: `attachment-collab:{attachment_id}`
- Broadcasts annotation create/update/delete events
- Presence tracking shows active viewers with avatar badges
- Optimistic UI updates with DB persistence

### Database Changes

**New table: `attachment_annotations`**
- `id` (uuid, PK)
- `attachment_id` (uuid, FK → task_attachments.id)
- `user_id` (uuid, FK → auth.users)
- `annotation_type` (enum: highlight, comment_pin, text_box, drawing, stamp)
- `page_number` (int, for multi-page PDFs)
- `position_data` (jsonb — x, y, width, height, path, etc.)
- `content` (text — comment text, stamp label, textbox content)
- `color` (text — hex color)
- `resolved` (boolean, default false)
- `created_at`, `updated_at`

**New table: `annotation_replies`**
- `id`, `annotation_id` (FK), `user_id`, `content`, `created_at`

RLS: authenticated users on the same project can read/write annotations.

### New Components

1. **`DocumentViewerOverlay.tsx`** — Full-screen modal with three-panel layout (toolbar, canvas, comments sidebar). Opens from `TaskAttachmentsSection` on attachment click.

2. **`DocumentCanvas.tsx`** — Renders the document based on file type (PDF pages, image, Office iframe). Manages zoom, scroll, page navigation.

3. **`AnnotationLayer.tsx`** — SVG/div overlay positioned over the document canvas. Renders all annotations and handles drawing interactions (click-to-place, drag-to-highlight, freehand draw).

4. **`AnnotationToolbar.tsx`** — Vertical toolbar with tool selection (pointer, highlight, comment, text, draw, stamp), color picker, undo/redo.

5. **`CommentsSidebar.tsx`** — Right panel listing all comment-type annotations as threads with replies, resolve button, and filtering (all/unresolved).

6. **`CollaboratorPresence.tsx`** — Bottom status bar showing online users (avatars), save status indicator, and page/version info.

### New Hook

**`useAttachmentCollaboration.ts`** — Manages annotation CRUD, Supabase Realtime channel for live sync, presence tracking, and optimistic state. Follows the same broadcast + presence pattern from `useTaskDocument.ts`.

### UX Flow

1. User clicks attachment card → `DocumentViewerOverlay` opens full-screen
2. Document loads in canvas; existing annotations render on the overlay
3. User selects a tool (e.g., highlight) → clicks/drags on document → annotation created and broadcast
4. Comment pins open a mini-thread popover; all comments also appear in sidebar
5. Other online users see annotations appear in real-time
6. "Save" persists to DB (auto-save with debounce, same as task documents)
7. Close overlay returns to task card

### Integration Point

In `TaskAttachmentsSection.tsx`, the attachment card's click handler changes from `window.open(downloadUrl, '_blank')` to opening the `DocumentViewerOverlay` with the attachment data. A separate download button remains for file download.

### Dependencies

- `react-pdf` (pdfjs-dist wrapper) for PDF rendering
- No new dependencies for Office docs (iframe-based viewer)
- Existing Supabase Realtime for collaboration

