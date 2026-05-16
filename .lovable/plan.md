# Competence Management System (CMS)

A new standalone module accessible from the main sidebar as **Competence Management** (separate top-level item, not nested under OR Maintenance).

## 1. Database (Supabase)

All tables protected by RLS: authenticated users can read; users with `admin` or `manager` role can write (uses existing `has_role()` security-definer pattern).

### `competence_profiles`
- name (e.g. "Control Room Operator")
- code (short, e.g. "CRO")
- description

### `competencies`
- title
- description
- created_by

### `competence_profile_competencies` (join)
- profile_id → competence_profiles
- competency_id → competencies
- weight (default 1)
- required_level (1–5, optional)
- UNIQUE(profile_id, competency_id)

### `competence_activities`
- competency_id → competencies
- title
- description
- activity_type ENUM: `vendor_training`, `ojt`, `assessment`, `certification`, `e_learning`, `mentoring`, `other`
- duration_hours, provider, target_completion_date (optional)

### `cms_people`
- first_name, last_name
- staff_id (UNIQUE)
- plant_id (FK), job_title
- profile_id → competence_profiles (assigned profile)
- user_id (optional link to auth.users)

### `person_competency_progress`
- person_id → cms_people
- competency_id → competencies
- progress (0–100)
- status ENUM: `not_started`, `in_progress`, `assessed`, `competent`, `expired`
- last_assessed_at, assessor_id, notes
- UNIQUE(person_id, competency_id)

### `person_activity_records`
- person_id, activity_id
- status: `planned`, `in_progress`, `completed`, `failed`
- completed_at, score, evidence_url

**Overall progress per person** = weighted average of `progress` across competencies belonging to the assigned profile. Exposed via SQL view `v_person_overall_progress` for fast reads.

## 2. UI/UX

### Navigation
- Add **Competence Management** as a new top-level item in `SidebarContent.tsx` (its own icon, e.g. `GraduationCap`).
- New route: `/competence-management` in `App.tsx`.
- Register in `sidebarNavigation.ts`.

### Pages

**`CMSLandingPage.tsx`** — header + KPI cards (total people, avg readiness %, # competencies, # profiles) + tabs:

1. **People** (default)
   - Searchable table: Name, Staff ID, Plant, Job Title, Assigned Profile, Overall Progress (bar + %).
   - Click progress bar → **PersonProgressSheet** (side overlay) with breakdown per competency: mini bars, status badges, last assessment date, linked activity records.
   - "Add Person" dialog.

2. **Competence Profiles**
   - Card grid with competency count + people count per profile.
   - "Add Profile" dialog.
   - Click → **ProfileDetailSheet**: list/add competencies (multi-select existing or create new), set weight.

3. **Competencies**
   - Table: Title, Description, # Profiles using, # Activities.
   - "Add Competency" dialog.
   - Click row → **CompetencyDetailSheet**: full description + linked activities tab.

4. **Activities**
   - Table grouped by competency: Title, Type badge, Provider, Duration.
   - Filter by activity type and competency.
   - "Add Activity" dialog with type selector.

### Components
```
src/components/cms/
  CMSLandingPage.tsx
  PeopleTab.tsx
  ProfilesTab.tsx
  CompetenciesTab.tsx
  ActivitiesTab.tsx
  PersonProgressSheet.tsx
  ProfileDetailSheet.tsx
  CompetencyDetailSheet.tsx
  dialogs/AddPersonDialog.tsx
  dialogs/AddProfileDialog.tsx
  dialogs/AddCompetencyDialog.tsx
  dialogs/AddActivityDialog.tsx

src/hooks/
  useCompetenceProfiles.ts
  useCompetencies.ts
  useCompetenceActivities.ts
  useCMSPeople.ts
  usePersonProgress.ts
```

### Design
- Semantic tokens only (no hardcoded colors).
- Progress bars match the gradient style used in P2A handover.
- Status badges reuse `competencyLevels.ts` color tiers.
- Side sheets follow `ProjectQualificationsSheet.tsx` pattern.

## 3. Routing & Sidebar wiring
- `App.tsx`: `<Route path="/competence-management" element={<CMSLandingPage />} />`.
- `SidebarContent.tsx`: add top-level entry with `GraduationCap` icon.
- `sidebarNavigation.ts`: register `'competence-management': '/competence-management'`.

## 4. Seed data
Sample profiles (CRO, Field Operator, Shift Engineer/Supervisor), ~6 competencies, a few activities per competency, and 4–5 demo people with varied progress.

## Out of scope (for now)
- CSV bulk import of people
- Auto-grading from assessments
- Expiry notifications / reminders
- Activity completion approval workflows

Confirm and I will implement.
