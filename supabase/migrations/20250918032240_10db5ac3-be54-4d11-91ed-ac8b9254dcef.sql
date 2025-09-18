-- Reset RLS policies on checklist_items to allow soft deletion for everyone (no AS PERMISSIVE syntax)

-- Drop all existing policies on checklist_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'checklist_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin users can manage checklist items" ON public.checklist_items';
    EXECUTE 'DROP POLICY IF EXISTS "Admin users can manage all checklist items" ON public.checklist_items';
    EXECUTE 'DROP POLICY IF EXISTS "All users can view active checklist items" ON public.checklist_items';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can create checklist items" ON public.checklist_items';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can update checklist items" ON public.checklist_items';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can update checklist items" ON public.checklist_items';
  END IF;
END $$;

-- Recreate minimal policies
CREATE POLICY "checklist_items_select_active"
ON public.checklist_items
FOR SELECT
USING (is_active = true);

CREATE POLICY "checklist_items_insert_anyone"
ON public.checklist_items
FOR INSERT
WITH CHECK (true);

CREATE POLICY "checklist_items_update_anyone"
ON public.checklist_items
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Optional admin policy
CREATE POLICY "checklist_items_admin_all"
ON public.checklist_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::user_role
  )
);