

## Replace Category Badge with Colored Project ID Label

You're right — the category badge adds visual noise without much actionable value on individual cards. The filter chips already handle category distinction. Modern task tools (Linear, Notion, Height) use **colored project labels** as the primary visual anchor on task cards, which is exactly what you're proposing.

### Plan

1. **Remove the category badge** from `TaskRow` in `UnifiedTaskList.tsx`
2. **Replace the project name text** with a `ProjectIdBadge` component (already exists in `src/components/ui/project-id-badge.tsx`) — this gives each project a unique gradient color derived from its ID
3. **Apply the same treatment** in `TaskKanbanBoard.tsx` kanban cards
4. If the project ID isn't available, fall back to showing the category label in muted text (no badge)

### Result
- Cleaner cards with less visual clutter
- Project identity becomes the dominant secondary info (colored, distinct per project)
- Category filtering stays available via the top filter chips
- Consistent with the project color system already used elsewhere in the app

