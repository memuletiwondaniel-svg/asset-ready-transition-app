-- Completely reset all RLS policies on checklist_items

-- First, drop all existing policies
DROP POLICY IF EXISTS "checklist_items_select_active" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_insert_anyone" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_update_anyone" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_admin_all" ON public.checklist_items;
DROP POLICY IF EXISTS "Admin users can manage checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Admin users can manage all checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "All users can view active checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Anyone can create checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Anyone can update checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Authenticated users can update checklist items" ON public.checklist_items;

-- Now create simple, working policies
CREATE POLICY "view_active_items"
ON public.checklist_items
FOR SELECT
USING (is_active = true);

CREATE POLICY "insert_items"
ON public.checklist_items
FOR INSERT
WITH CHECK (true);

CREATE POLICY "update_items"
ON public.checklist_items
FOR UPDATE
USING (true)
WITH CHECK (true);