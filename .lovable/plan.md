

# Plan: Personal Backlog with Voice Input

## UI/UX Placement Decision

Best location: **Slide-out panel triggered from the sidebar** — a new "My Backlog" nav item sits alongside "My Tasks" in the sidebar. Tapping it opens a lightweight, full-height panel. This keeps it one tap away from any screen, mobile-friendly, and doesn't clutter the main workspace.

The existing "My Tasks" page is for project/PSSR assigned tasks. This new "My Backlog" is your personal notebook replacement — completely separate, private, and simple.

## Implementation

### Task 1: Database Table
Create `personal_backlog` table:
- `id UUID PK`, `user_id UUID NOT NULL` (references auth.users), `description TEXT NOT NULL`, `priority TEXT DEFAULT 'normal'` (low/normal/high), `status TEXT DEFAULT 'pending'` (pending/done), `created_at TIMESTAMPTZ`, `completed_at TIMESTAMPTZ`, `sort_order INT`
- RLS: Users can only CRUD their own rows (`auth.uid() = user_id`)

### Task 2: Backlog Page Component
Create `src/pages/BacklogPage.tsx`:
- **Top bar**: Text input with a microphone icon button (uses existing `useVoiceInput` hook). Type or dictate → press Enter or tap Add → item appears at top of list
- **List**: Simple checklist. Each item shows description, priority badge, created time. Tap checkbox to mark done (moves to bottom, strikethrough). Swipe or click X to delete
- **Filters**: Three toggle pills at top — All / Pending / Done
- **Inline edit**: Tap any item text to edit in-place
- **Priority**: Long-press or dropdown to set Low/Normal/High (color-coded dot)
- Mobile-optimised: large touch targets, full-width input

### Task 3: Hook for CRUD
Create `src/hooks/usePersonalBacklog.ts`:
- `useQuery` to fetch user's backlog items ordered by `status ASC, sort_order ASC, created_at DESC`
- Mutations: add, toggle status, update description, update priority, delete
- Optimistic updates for snappy feel

### Task 4: Add to Sidebar Navigation
Add a "My Backlog" entry (icon: `ClipboardList`) to the `navigationItems` array in `SidebarContent.tsx`, positioned after "My Tasks". Add route `/my-backlog` in `App.tsx` pointing to `BacklogPage`.

### Task 5: Voice Integration
Wire the existing `useVoiceInput` hook into the add-task input:
- Mic icon pulses when listening
- Transcript auto-populates the input field
- User can review/edit before confirming

No new dependencies needed — uses Web Speech API via the existing hook, Supabase for persistence, and existing UI components (Input, Button, Badge, Checkbox).

