

## Fix: Gantt Chart Activities Should Open the Same Task Detail Overlay as Task Cards

### Problem
When clicking an activity in the Gantt chart, the `ORAActivityTaskSheet` receives a **synthetic task object** constructed inline. When clicking the same task's card in the Kanban board, it receives the **actual `user_tasks` database record**. While both use the same overlay component, the different input data causes behavioral differences (missing attachments section, comments, reviewers, read-only state, etc.).

Three code paths in `ORPGanttChart.tsx` construct synthetic payloads instead of using the real task:
1. **P2A activities** (lines 1048-1074) — always synthetic, ignores `taskEntry.activityTask`
2. **VCR activities** (lines 1089-1117) — always synthetic, ignores `taskEntry.activityTask`
3. **Fallback path** (lines 1186-1195) — synthetic when no task is mapped

### Fix

**File: `src/components/orp/ORPGanttChart.tsx`**

For all three activity click handlers (P2A, VCR, and generic), restructure the logic to:

1. **Always prefer the real `taskEntry.activityTask`** when it exists — spread it and merge only the additional metadata fields (e.g., `action`, `sibling_activities`, `vcr_id`) that the overlay needs for its CTA buttons.
2. **Only fall back to synthetic payloads** when no `user_tasks` record is mapped to the activity (e.g., the current user is not the assignee).

The merged payload pattern:
```typescript
if (taskEntry?.activityTask) {
  setSelectedOraActivity({
    ...taskEntry.activityTask,
    metadata: {
      ...taskEntry.activityTask.metadata,
      // Gantt-specific context fields
      action: 'create_p2a_plan', // or 'create_vcr_delivery_plan'
      sibling_activities: siblingActivities,
      // ... other Gantt context
    },
  });
} else {
  // Existing synthetic fallback (unchanged)
}
```

This ensures the overlay receives the same `id`, `user_id`, `type`, `status`, `created_at`, and `metadata` structure as when opened from the Kanban board — enabling full functionality (attachments, comments, reviewers, dirty tracking, save).

### Scope
- Single file change: `src/components/orp/ORPGanttChart.tsx`
- Three code blocks updated (P2A handler, VCR handler, generic handler)
- No database or backend changes needed

