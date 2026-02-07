

# Fix: Persist and Restore Subsystem Data in P2A Wizard

## Problem

When importing systems from GoCompletions (CMS), the import correctly brings in subsystems and progress percentages. However, when the user saves the draft and returns later:
- **Subsystems are lost** -- they are never written to the `p2a_subsystems` table
- **Progress percentages are lost** -- the `completion_percentage` column is never populated in `p2a_systems`

This happens because the save and load functions in `useP2APlanWizard.ts` do not handle subsystem data or progress values.

## Root Causes

| Area | Issue |
|------|-------|
| **Save (persist)** | `persistPlanToDatabase()` inserts into `p2a_systems` but only saves `system_id`, `name`, `is_hydrocarbon`. It skips `completion_percentage` and never inserts into `p2a_subsystems`. |
| **Load (draft)** | `loadDraftFromDatabase()` selects from `p2a_systems` but only reads `id, system_id, name, is_hydrocarbon`. It never queries `p2a_subsystems` at all, so the wizard state has empty subsystem arrays. |

## Solution

All changes are in a single file: `src/hooks/useP2APlanWizard.ts`

### 1. Update `persistPlanToDatabase()` -- Save subsystems and progress

When saving each system to `p2a_systems`:
- Include `completion_percentage` from `system.progress` (rounded to integer)
- After saving the system and getting its new database UUID, insert any subsystems from `system.subsystems` into `p2a_subsystems`

```
For each system in state.systems:
  1. INSERT into p2a_systems with completion_percentage = Math.round(system.progress || 0)
  2. If system.subsystems exists and has items:
     - Delete existing subsystems for this system (clean slate)
     - INSERT each subsystem into p2a_subsystems with:
       - system_id = saved system's new UUID
       - subsystem_id = subsystem.system_id
       - name = subsystem.name
       - completion_percentage = Math.round(subsystem.progress || 0)
```

Also add a bulk delete of `p2a_subsystems` at the start (before deleting systems) to avoid orphaned rows:
- Query all system UUIDs for the plan
- Delete subsystems where `system_id` is in those UUIDs
- Then delete the systems themselves (existing logic)

### 2. Update `loadDraftFromDatabase()` -- Load subsystems and progress

When loading systems from the database:
- Include `completion_percentage` in the SELECT from `p2a_systems`
- After loading systems, query `p2a_subsystems` for all system UUIDs
- Map subsystems back onto each system's `subsystems` array

```
1. SELECT id, system_id, name, is_hydrocarbon, completion_percentage FROM p2a_systems
2. Map completion_percentage to WizardSystem.progress
3. Query p2a_subsystems WHERE system_id IN (all loaded system UUIDs)
4. Group subsystems by system_id
5. Attach each group to the matching WizardSystem.subsystems array
```

### Summary of Changes

**File: `src/hooks/useP2APlanWizard.ts`**

- `loadDraftFromDatabase()`:
  - Add `completion_percentage` to the systems SELECT query
  - Map it to `progress` on each `WizardSystem`
  - Query `p2a_subsystems` for all system IDs
  - Attach subsystems to each system

- `persistPlanToDatabase()`:
  - Before deleting systems, delete their subsystems first
  - Add `completion_percentage` to each system INSERT
  - After inserting each system, INSERT its subsystems into `p2a_subsystems`

No database schema changes are required -- the `p2a_systems.completion_percentage` column and the `p2a_subsystems` table already exist with the correct structure.
