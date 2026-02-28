

## Plan: Show ITP Activities & Status per System in the VCR Systems Tab

### Current State
- The Systems tab (`VCRSystemsTab.tsx`) shows system cards with progress wheels, punchlist counts, and HC/non-HC indicators
- When expanded, each system only shows placeholder punchlist items
- ITP activities exist in `p2a_itp_activities` (fields: `activity_name`, `inspection_type` W/H, `system_id`, `handover_point_id`)
- ORA plan activities track ITP completion status via `ora_plan_activities` where `source_type = 'itp'` and `source_ref_table = 'p2a_itp_activities'`

### Changes

**1. Create a hook `useSystemITPActivities`**
- Query `p2a_itp_activities` filtered by `handover_point_id` (VCR) and `system_id`
- For each ITP activity, join/lookup `ora_plan_activities` where `source_ref_id = itp.id` and `source_ref_table = 'p2a_itp_activities'` to get `status` and `completion_percentage`
- Return merged list: `{ id, activity_name, inspection_type, ora_status, ora_completion_percentage }`

**2. Update `VCRSystemsTab.tsx` collapsible content**
- Replace the placeholder punchlist expansion with two sections:
  - **ITP Activities** — a compact table showing each activity's name, W/H badge, and ORA status badge (Not Started / In Progress / Completed) with color coding
  - **Punchlist Items** — keep existing (below ITP section)
- Fetch ITP activities for each expanded system using the new hook
- Show "No ITP activities defined" empty state if none exist

**3. Status badge mapping**
- `NOT_STARTED` → grey outline badge
- `IN_PROGRESS` → amber badge  
- `COMPLETED` → emerald badge

