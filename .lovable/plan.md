

## Problem

The PSSR detail overlay has two performance and correctness issues with name/picture resolution:

### 1. N+1 Query Problem in `roleProfileMap` (Lines 161-213)
The `roleProfileMap` query iterates over every role name and makes **sequential individual Supabase queries** -- one per role, with a plant-specific attempt first, then a fallback. For a PSSR with 10+ delivering/approving roles, this means 10-20+ serial network requests. This is the primary cause of erratic performance and slow rendering.

### 2. Approver Profile Resolution Depends on `user_id` Being Set
For PSSR and SoF approvers (lines 814-858), profiles are only resolved when `approver.user_id` is populated. However, from the network data we can see approvers like "Engr. Manager" and "Central Mtce Lead" have `user_id: null` and `approver_name: "Pending Assignment"`. These show only the role name with no avatar because:
- The `approverProfiles` query only fetches profiles for non-null `user_id`s
- There is no fallback to resolve by position/role name when `user_id` is null

## Plan

### 1. Batch the `roleProfileMap` query (eliminate N+1)

Replace the sequential per-role Supabase calls with a single bulk fetch using the already-cached `useProfileUsers` hook (which loads all active profiles once with a 2-minute cache). Use the same position-matching logic client-side instead of making individual server calls.

**File: `src/components/pssr/PSSROverviewTab.tsx`**
- Import `useProfileUsers` from `@/hooks/useProfileUsers`
- Replace the `roleProfileMap` `useQuery` block (lines 161-213) with a `useMemo` that filters the cached `profileUsers` array by position matching, reusing the plant name from `locationInfo`
- This eliminates all the individual `ilike` queries and uses already-fetched data

### 2. Resolve approvers without `user_id` by position fallback

Enhance the `approverProfiles` query (lines 223-243) to also resolve approvers that have `user_id: null` but have an `approver_role` set. Use the same `profileUsers` cache to find matching profiles by position.

**File: `src/components/pssr/PSSROverviewTab.tsx`**
- Add a `useMemo` that builds a `roleToProfile` map from `profileUsers` for approver roles that lack a `user_id`
- In the PSSR Approvers and SoF Approvers rendering sections (lines 814-858), fall back to this `roleToProfile` map when `approver.user_id` is null
- This ensures "Engr. Manager", "Central Mtce Lead", etc. show the resolved person's name and avatar even when the `user_id` was not saved at creation time

### 3. Add `staleTime` to prevent redundant refetches

Add `staleTime: 60000` to the `approverProfiles` and `sof-approvers` queries to prevent unnecessary refetches when navigating between tabs within the same PSSR overlay.

### Technical Details

The key change replaces ~20 sequential network requests with zero additional requests by leveraging the `useProfileUsers` hook that already caches all active profiles. The position matching logic will mirror the existing pattern from `WizardStepApprovers.tsx` (plant-aware, director-aware, project-exclusion).

**Files to modify:**
- `src/components/pssr/PSSROverviewTab.tsx` -- Refactor `roleProfileMap` to use cached profiles; add position-based fallback for null `user_id` approvers; add `staleTime` to queries.

