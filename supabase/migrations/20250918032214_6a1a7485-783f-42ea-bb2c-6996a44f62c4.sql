-- Reset RLS policies on checklist_items to allow soft deletion for everyone

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

-- Recreate minimal, explicit PERMISSIVE policies
CREATE POLICY "checklist_items_select_active" AS PERMISSIVE
ON public.checklist_items
FOR SELECT
USING (is_active = true);

CREATE POLICY "checklist_items_insert_anyone" AS PERMISSIVE
ON public.checklist_items
FOR INSERT
WITH CHECK (true);

CREATE POLICY "checklist_items_update_anyone" AS PERMISSIVE
ON public.checklist_items
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Optional: admins can also do anything (redundant but explicit)
CREATE POLICY "checklist_items_admin_all" AS PERMISSIVE
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