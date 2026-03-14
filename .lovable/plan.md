

## Problem

Simple tasks and ad-hoc review tasks have no attachment functionality. When a task owner submits for approval, they cannot attach the document being reviewed. Reviewers cannot see or attach documents either. The user also wants live collaborative editing, but that requires significant infrastructure (WebSocket/CRDT) beyond current scope.

## Plan

### Phase 1: Task Attachments (Full-Stack)

**1. Database — `task_attachments` table + storage bucket**

Create a new migration with:
- `task_attachments` table: `id`, `task_id` (FK to `user_tasks`), `file_name`, `file_path`, `file_size`, `file_type`, `uploaded_by` (UUID), `created_at`
- RLS policies: authenticated users who own the task OR are assigned reviewers can SELECT/INSERT; only the uploader can DELETE
- Storage bucket `task-attachments` (public for download simplicity), with RLS on `storage.objects` for authenticated upload/delete

**2. Hook — `useTaskAttachments.ts`**

- Fetches attachments for a given `task_id` (and optionally a `source_task_id` for reviewers)
- `uploadAttachment(file)` — uploads to `task-attachments/{task_id}/{timestamp}-{filename}`, inserts row
- `deleteAttachment(id)` — removes storage object + row
- `downloadAttachment(filePath)` — generates download URL

**3. Component — `TaskAttachmentsSection.tsx`**

Modern enterprise SaaS design:
- Drag-and-drop zone with file type icons (PDF, DOC, XLS, image thumbnails)
- File cards showing: icon, name, size, uploader avatar+name, timestamp, download/delete actions
- Upload progress indicator
- Accepts: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, images (up to 10MB)
- Read-only mode when task is completed

**4. Integration into `TaskDetailSheet.tsx`**

- **Simple tasks (owner view)**: Add `TaskAttachmentsSection` between `TaskReviewersSection` and `TaskActivityFeed` (around line 874). Shows attachments on the owner's task with full upload/delete capability.
- **Ad-hoc review (reviewer view)**: Show source task's attachments (read-only download) so reviewers can access what was submitted. Also allow reviewers to upload their own attachments to the review task.
- Attachments from the **source task** are displayed in the reviewer's sheet under the source task info card (around line 912), with a "Submitted Documents" label.

### Files to Create/Modify

| File | Action |
|------|--------|
| New migration SQL | Create `task_attachments` table, RLS, storage bucket |
| `src/hooks/useTaskAttachments.ts` | New — CRUD hook |
| `src/components/tasks/TaskAttachmentsSection.tsx` | New — UI component |
| `src/components/tasks/TaskDetailSheet.tsx` | Wire attachments into simple task + ad-hoc review sections |

### Live Collaboration (Phase 2 — Future)

Real-time co-editing requires WebSocket infrastructure (Tiptap + Yjs or similar CRDT). This is a major architectural addition. For now, the shared attachments + activity feed comments provide a practical collaboration workflow where all parties can upload document versions and discuss via the feed.

