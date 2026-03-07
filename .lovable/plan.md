

## Plan: Portfolio-Based Access Control for Projects and Task Ownership Enforcement

### Problem
Currently, any authenticated user can view and modify any project's ORA Plan, Gantt chart activities, P2A plans, etc. A Senior ORA Engineer assigned to Central (KAZ) portfolio can complete tasks and modify activities for UQ projects (DP354, DP83C) they don't belong to. Tasks should only be completable by their assigned owner.

### Current State (What Already Works)
- **Task visibility**: `useUserTasks` already filters by `user_id = userId` — tasks only show in the assigned user's tray.
- **Task mutation RLS**: The `user_tasks` table has RLS policies enforcing `auth.uid() = user_id` for UPDATE/DELETE — so at the database level, only the task owner can modify their own tasks. This is already secure.
- **Task assignment**: The `auto_create_ora_plan_task` trigger and `materializeActivities()` correctly assign tasks to the specific Sr. ORA Engineer on the project team.

### What Needs to Change

#### 1. Create a `useProjectAccess` hook
A new hook that checks whether the current user is a team member of a given project. Returns `{ isTeamMember, isLoading }`.

```
src/hooks/useProjectAccess.ts
```

Queries `project_team_members` for the current `user.id` and `projectId`. If found, the user has write access. If not, they have view-only access. Admins and project creators always get write access.

#### 2. Add read-only mode to ProjectDetailsPage
Pass the `isTeamMember` flag down to child widgets. When `false`:
- Hide the "Edit" button on project details
- The ORA Gantt chart hides "Add Activity" button and disables drag-resize on bars
- The P2A and PSSR widgets show data but hide creation/modification CTAs

#### 3. Add read-only mode to ORPGanttChart
Accept an `isReadOnly` prop. When `true`:
- Hide the "Add Activity" dropdown button
- Disable the status column edit buttons (show badges only)
- The activity task sheet opens in view-only mode (no Save button)
- Disable Gantt bar drag/resize

#### 4. Add read-only mode to ORAActivityTaskSheet
Accept an `isReadOnly` prop. When `true`:
- Hide the Save button
- Make all form fields disabled/read-only
- Hide status toggle buttons

#### 5. Frontend guard on task completion actions
In `MyTasksPanel`, `UnifiedTaskList`, `ReviewTasksPanel`, and other panels where tasks are displayed — these already only show the current user's own tasks (filtered by `user_id`), so no change needed. The RLS already prevents cross-user task mutations.

The key enforcement point is the **project detail page** — preventing a non-team-member from modifying project artifacts directly through the Gantt chart or widget CTAs.

### Files to Create
- `src/hooks/useProjectAccess.ts` — new hook

### Files to Modify
- `src/pages/ProjectDetailsPage.tsx` — use `useProjectAccess`, pass `isReadOnly` to widgets
- `src/components/orp/ORPGanttChart.tsx` — accept and enforce `isReadOnly` prop
- `src/components/tasks/ORAActivityTaskSheet.tsx` — accept and enforce `isReadOnly` prop
- `src/components/widgets/ORPActivityPlanWidget.tsx` — pass through `isReadOnly`

### No Database Changes Needed
The existing RLS policies on `user_tasks` already enforce task ownership. The `project_team_members` table is already readable by all authenticated users, so the frontend hook can query it directly.

