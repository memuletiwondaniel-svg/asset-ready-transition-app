

## Bug Fix + Inspection Test Plan (ITP) Implementation

### Bug: "No Systems Mapped" on Step 6

**Root cause**: The `SystemsStep` query requests columns `overall_completion` and `itr_completion` from `p2a_systems`, but those columns don't exist. The actual column names are `completion_percentage`, `itr_a_count`, `itr_b_count`, etc. Because the query uses an `!inner` join with invalid columns, Supabase returns an error silently, causing the empty state.

**Fix**: Correct the column names in the query to match the actual schema.

---

### Feature: Transform Step 6 into an Inspection Test Plan (ITP)

Step 6 will be renamed from "Systems" to "Inspection Test Plan" and redesigned to let the project and asset agree on **Witness (W)** and **Hold (H)** points for each system's key activities.

**Definitions:**
- **Witness (W)**: Asset wants to be notified and observe the activity (e.g., line cleaning, leak testing, FAT, SAT, cause & effect testing)
- **Hold (H)**: Asset MUST be present to witness AND sign off (e.g., MCC Tri-party Walkdown, RFO certificate sign-off, Performance Testing, Dynamic Commissioning)

### UI Design

**Layout**: Each mapped system is shown as an expandable card. The card header shows the system name, code, and HC status. Expanding reveals the system's ITP activity rows.

**Activity rows**: Each row represents a milestone/activity with:
- Activity name (text input or selection from common activities)
- A toggle group to mark it as **W** (Witness) or **H** (Hold) or **N/A**
- The W badge uses amber styling, H badge uses red styling
- Optional notes field

**Pre-populated activities**: Common commissioning activities are suggested per system:
- Leak Testing, Line Cleaning/Flushing, Loop Testing, Cause & Effect Testing, FAT, SAT, MCC Walkdown, RFO Walkdown, Performance Testing, Dynamic Commissioning, etc.

**Header bar**: Search filter, system count badge, and summary stats (e.g., "12W / 5H across 8 systems")

### Database

A new table `p2a_itp_activities` will store the ITP data:

```text
p2a_itp_activities
  id              uuid PK
  handover_point_id uuid FK -> p2a_handover_points
  system_id       uuid FK -> p2a_systems
  activity_name   text
  inspection_type text ('WITNESS' | 'HOLD' | 'NA')
  notes           text (nullable)
  display_order   integer
  created_at      timestamptz
  updated_at      timestamptz
```

RLS: Authenticated users can read/write.

### Technical Steps

1. **Fix the SystemsStep query** -- correct `overall_completion` to `completion_percentage` and `itr_completion` to `itr_a_count/itr_b_count` so systems load correctly.

2. **Create `p2a_itp_activities` table** via SQL migration with RLS policies.

3. **Rename Step 6** from "Systems" to "Inspection Test Plan" in `VCRExecutionPlanWizard.tsx`, update icon to `ClipboardList` or `Shield`.

4. **Rewrite `SystemsStep.tsx`** as the new ITP component:
   - Fetch mapped systems from `p2a_handover_point_systems` (with corrected column names)
   - Fetch existing ITP activities from `p2a_itp_activities`
   - Render each system as a collapsible card with its activity rows
   - Each activity row has: name, W/H/NA toggle, optional notes
   - "Add Activity" button per system to add custom activities
   - Pre-populate with default activities when a system has none
   - Auto-save changes via mutations

5. **Update step description** in the wizard to: "Define witness and hold points for each system"

