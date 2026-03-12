

## Plan: Merge Approver Decisions into Comments Feed

### What Changes

Approver actions (Approved/Rejected + comments) will appear **inline in the comments section** as visually distinct system entries, merged chronologically with regular user comments. The existing red rejection banner stays for high-visibility signaling.

### Implementation Steps

**1. Expand the approver query** (`ORAActivityTaskSheet.tsx`, lines 234–249)

Change the existing `p2aRejectionInfo` query to fetch **all** approver records that have `approved_at IS NOT NULL` (i.e., decisions made), not just `REJECTED`. Select `user_id`, `status`, `role_name`, `comments`, and `approved_at`. Also fetch each approver's profile (full_name, avatar_url) from the `profiles` table.

**2. Build a unified activity feed** (new `useMemo` block)

Create a merged array combining:
- Regular `dbComments` → `{ type: 'comment', ...fields, timestamp: created_at }`
- Approver decisions → `{ type: 'approval_action', status, role_name, comments, full_name, avatar_url, timestamp: approved_at }`

Sort descending by timestamp.

**3. Update the comments rendering** (lines 988–1007)

Replace `dbComments.map(...)` with `activityFeed.map(...)`. For each item:
- **type === 'comment'**: Render exactly as today (avatar, comment text, author line).
- **type === 'approval_action'**: Same avatar layout but with a colored badge before the comment text:
  - `APPROVED` → green pill badge (`bg-emerald-100 text-emerald-700`)
  - `REJECTED` → red pill badge (`bg-red-100 text-red-700`)
  - Author line: `{Full Name} · {role_name} · {relative time}`

**4. Update the comment count badge** (line 970)

Change from `dbComments.length` to `activityFeed.length` to reflect total entries.

### Files Modified

- `src/components/tasks/ORAActivityTaskSheet.tsx`

