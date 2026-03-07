

## Plan: Persist ORA Activity Comments to Database

### Problem
Comments on ORA activities are stored in local React state (`useState`) and reset to an empty array every time the sheet opens (line 137: `setComments([])`). They are never saved to the database.

### Solution

#### 1. Create `ora_activity_comments` database table
New migration to create a table for persisting activity-level comments:
- `id` (uuid, PK)
- `ora_plan_activity_id` (text, not null) — the activity ID
- `orp_plan_id` (uuid, not null) — the plan ID for scoping
- `user_id` (uuid, references auth.users)
- `comment` (text, not null)
- `created_at` (timestamptz)

Enable RLS with a policy allowing authenticated users to read/write comments for their tenant.

#### 2. Create `useORAActivityComments` hook
New hook (`src/hooks/useORAActivityComments.ts`) that:
- **Fetches** comments for a given activity ID, joining with `profiles` to get `full_name` and `avatar_url`
- **Adds** comments via a mutation that inserts into the table and invalidates the query
- Returns `{ comments, isLoading, addComment, isAdding }`

#### 3. Update `ORAActivityTaskSheet.tsx`
- Import and use the new `useORAActivityComments(realOraActivityId)` hook
- On sheet open, load persisted comments from the database (remove `setComments([])` reset)
- The "Add" button calls the hook's `addComment` mutation instead of local state push
- Display comment history below the input box with user name, avatar, and timestamp
- Remove comments from the `isDirty` tracking (they save immediately, not on "Save")
- Remove the local `comments` state array entirely — use the hook's data directly

#### 4. Comment display format
Each comment shows:
- User avatar + full name
- Comment text
- Relative timestamp (e.g., "2 hours ago")
- Sorted newest first, displayed in a scrollable area above the input

### Files to create/modify
- `supabase/migrations/xxx.sql` — new table + RLS
- `src/hooks/useORAActivityComments.ts` — new hook
- `src/components/tasks/ORAActivityTaskSheet.tsx` — integrate hook, remove local state

