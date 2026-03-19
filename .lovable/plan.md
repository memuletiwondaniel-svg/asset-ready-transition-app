

## Problem

Two issues are causing only 103 entries to appear:

1. **Supabase 1000-row default limit**: The query in `DmsDocumentTypesTab.tsx` does not override Supabase's default limit of 1000 rows per request. So at most 1000 rows are fetched.

2. **Deduplication hides most rows**: When discipline columns are hidden (the default), the deduplication logic collapses rows with the same `code + document_name`, reducing ~1000 rows down to ~103 unique combinations.

3. **Database has 1224 rows, not 1297**: The seed migration inserted 1224 rows instead of the expected 1297 (73 rows missing). This is a secondary data issue.

## Plan

### Step 1: Fix the 1000-row query limit

**File: `src/components/admin-tools/dms/DmsDocumentTypesTab.tsx`**

Add `.range(0, 1999)` to the Supabase query to fetch all rows beyond the default 1000 limit.

### Step 2: Seed the missing 73 rows

Parse the uploaded `Document-2.xlsx` to identify which rows are missing from the database and insert them via a migration.

### Step 3: Verify row count display

Optionally show a total count in the card description (e.g., "Showing 245 of 1297 entries") so the user can confirm all data is loaded.

