

# Live Collaborative Document Editing for Tasks

## Overview

Add a real-time collaborative rich-text editor to task detail sheets, allowing task owners and reviewers to co-edit a shared document, see live cursors/presence, and leave inline comments. This uses the existing Tiptap editor (already installed) combined with Supabase Realtime Broadcast and Presence channels for live sync — no additional WebSocket infrastructure required.

## Architecture

```text
┌──────────────────────────────────────────────┐
│  TaskDetailSheet                             │
│  ┌─────────────────────────────────────────┐ │
│  │  CollaborativeDocumentEditor            │ │
│  │  ┌───────────────┐  ┌────────────────┐  │ │
│  │  │ Tiptap Editor │  │ Presence Bar   │  │ │
│  │  │ (shared doc)  │  │ (online users) │  │ │
│  │  └───────┬───────┘  └───────┬────────┘  │ │
│  │          │                  │            │ │
│  │    Supabase Realtime Channel            │ │
│  │    • Broadcast: doc updates (debounced) │ │
│  │    • Presence: online users + cursors   │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │  task_documents table (persisted state) │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

## Database

**New table: `task_documents`**
- `id` UUID PK
- `task_id` UUID FK → user_tasks, UNIQUE (one document per task)
- `content` TEXT (HTML from Tiptap)
- `last_edited_by` UUID
- `updated_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ

RLS: Authenticated users who own the task or are assigned reviewers can SELECT/UPDATE.

**New table: `task_document_comments`** (inline comments)
- `id` UUID PK
- `task_document_id` UUID FK → task_documents
- `user_id` UUID
- `comment` TEXT
- `selection_text` TEXT (highlighted text the comment refers to)
- `position_data` JSONB (editor position metadata)
- `resolved` BOOLEAN DEFAULT false
- `created_at` TIMESTAMPTZ

RLS: Same access as parent document.

## Frontend Components

### 1. `useTaskDocument.ts` — Hook
- Fetches/creates the shared document for a task
- Saves content (debounced, ~2s after last edit)
- Manages Supabase Realtime channel:
  - **Broadcast**: Sends `doc-update` events with HTML content on each edit
  - **Presence**: Tracks online users (name, avatar, cursor position)
- Handles conflict resolution: last-write-wins with merge notification

### 2. `CollaborativeDocumentEditor.tsx` — Component
- Tiptap editor pre-loaded with the task's shared document content
- **Presence bar**: Shows avatars of users currently viewing/editing with colored dots
- **Toolbar**: Bold, italic, lists, headings, highlight (for inline comments)
- **Auto-save indicator**: "Saving…" / "Saved" / "Edited by [Name] just now"
- **Inline comments**: Select text → add comment; comments shown in a side panel or popover
- Read-only mode when task is completed

### 3. Integration into `TaskDetailSheet.tsx`
- For **simple tasks** (owner view): Add a "Shared Document" tab/section with the collaborative editor, placed between Attachments and Reviewers
- For **ad-hoc review** (reviewer view): Same collaborative editor connected to the **source task's** document, allowing reviewers to edit the same document the owner created
- Both parties edit the same `task_documents` row, seeing each other's changes in real-time

## Real-Time Sync Flow

1. User A opens task → joins Supabase Realtime channel `task-doc:{taskId}`
2. User A types → Tiptap `onUpdate` fires → debounced broadcast of HTML via channel
3. User B receives broadcast → merges into their editor (cursor-preserving update)
4. Every 2s of inactivity, latest content is persisted to `task_documents` table
5. Presence tracks who's online; shown as avatar pills above the editor
6. On reconnect, content is re-fetched from DB (source of truth)

## UI Design (Enterprise SaaS)

- Clean toolbar with subtle dividers, matching existing UI patterns
- Presence avatars with colored ring indicators (green = active, amber = idle)
- Auto-save status in top-right corner: subtle pill showing "All changes saved" or "Saving..."
- Inline comment highlights in light yellow; resolved comments greyed out
- Mobile-responsive: toolbar collapses to essential actions on small viewports

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `task_documents` + `task_document_comments` tables with RLS |
| `src/hooks/useTaskDocument.ts` | New — real-time document sync hook |
| `src/components/tasks/CollaborativeDocumentEditor.tsx` | New — Tiptap editor with presence + auto-save |
| `src/components/tasks/DocumentPresenceBar.tsx` | New — online user avatars |
| `src/components/tasks/TaskDetailSheet.tsx` | Add collaborative editor section |

