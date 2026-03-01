
-- =============================================================
-- Step 6: Add has_permission() to RLS policies for server-side enforcement
-- =============================================================

-- -----------------------------------------------
-- PROJECTS TABLE: Tighten INSERT policy
-- -----------------------------------------------

-- Drop the overly permissive "Anyone can create projects" policy
DROP POLICY IF EXISTS "Anyone can create projects" ON public.projects;

-- Replace with permission-based INSERT policy
-- Only users whose role has 'create_project' permission can insert
CREATE POLICY "Permission: create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_permission(auth.uid(), 'create_project'::app_permission)
);

-- -----------------------------------------------
-- PSSRS TABLE: Tighten INSERT policy
-- -----------------------------------------------

-- The existing "Users can create their own PSSRs" checks auth.uid() = user_id
-- but doesn't check if they have permission. Replace it.
DROP POLICY IF EXISTS "Users can create their own PSSRs" ON public.pssrs;

-- New policy: must have create_pssr permission AND set user_id to self
CREATE POLICY "Permission: create PSSRs"
ON public.pssrs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.has_permission(auth.uid(), 'create_pssr'::app_permission)
);

-- -----------------------------------------------
-- ROLE_PERMISSIONS TABLE: Already has admin-only policies ✓
-- (Admins can insert/update/delete, anyone can read)
-- This is correct — no changes needed.
-- -----------------------------------------------
