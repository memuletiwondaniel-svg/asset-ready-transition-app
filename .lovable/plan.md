
# Enhanced Schedule Activity Sheet with Invite List and Message Preview

## Overview
Redesign the `ScheduleActivitySheet` to include three sections when scheduling a key activity: (1) date/time/location selection, (2) an editable invitation message preview, and (3) a reviewable invite list that is context-aware based on the activity type.

## Invite List Logic

| Activity Type | Invitees |
|---|---|
| PSSR Kick-off | PSSR Lead + Delivering Parties + Approving Parties |
| PSSR Walkdown | PSSR Lead + Delivering Parties + Approving Parties |
| SoF Meeting | PSSR Lead + SoF Approvers + Deputy Plant Director |
| Custom | PSSR Lead + Delivering Parties + Approving Parties (default) |

## Changes

### 1. Update `ScheduleActivitySheet` props and data fetching
- Accept `pssrId` as a new prop (currently only receives the activity object)
- Fetch PSSR details (lead info, scope/title) using `pssrId`
- Fetch delivering/approving party profiles from `pssr_checklist_responses` + `profiles` (reuse existing role-resolution pattern from `PSSROverviewTab`)
- Fetch `pssr_approvers` and `sof_approvers` records with their profiles
- Compute the invite list based on `activity.activity_type`

### 2. Redesign the sheet layout (scheduling mode)
The sheet will have three collapsible/scrollable sections:

**Section A - Schedule Details** (existing, mostly unchanged)
- Date picker, start/end time, location fields

**Section B - Invitation Preview**
- Reuse the existing `InvitationPreview` component from `src/components/pssr/walkdown/InvitationPreview.tsx`
- Pre-populate subject as `"[Activity Label] - [PSSR Title]"`
- Generate a default body referencing the activity type and PSSR scope
- Allow editing via the existing edit/preview toggle

**Section C - Invite List**
- Display the computed list of invitees with avatar, name, and position
- Each invitee shown as a compact row (similar to the Review & Approvals panel style)
- Group by role type (e.g., "PSSR Lead", "Delivering Parties", "Approving Parties" or "SoF Approvers")

### 3. Update `PSSROverviewTab` to pass `pssrId`
- Pass `pssrId` to `ScheduleActivitySheet` so it can fetch its own data

### 4. Fallback key activity rows
- Make the fallback rows (for pre-UNDER_REVIEW PSSRs) also clickable so they open the scheduling sheet, initializing the activities on the fly if needed

## Technical Details

### Files to modify:
- **`src/components/pssr/ScheduleActivitySheet.tsx`** - Major refactor: add `pssrId` prop, add data-fetching queries for PSSR details + party profiles + approvers, compute invite list based on activity type, integrate `InvitationPreview`, render invite list section, widen sheet to `sm:max-w-lg`
- **`src/components/pssr/PSSROverviewTab.tsx`** - Pass `pssrId` to `ScheduleActivitySheet`; make fallback activity rows clickable

### Data fetching inside ScheduleActivitySheet:
- Query `pssrs` table joined with lead profile for PSSR details
- Query `pssr_checklist_responses` for delivering/approving roles, then resolve to profiles (same pattern as PSSROverviewTab)
- Query `pssr_approvers` and `sof_approvers` tables, resolve user profiles
- Filter: For kick-off/walkdown, use lead + delivering + approving parties. For SoF, use lead + SoF approvers + any approver with role containing "Dep. Plant Director"

### Invite list data structure:
```typescript
interface Invitee {
  name: string;
  position: string | null;
  avatarUrl: string | null;
  group: 'PSSR Lead' | 'Delivering Party' | 'Approving Party' | 'SoF Approver';
}
```
