-- Drop the permissive policies we just created
DROP POLICY IF EXISTS "Authenticated users can insert checklist categories" ON public.pssr_checklist_categories;
DROP POLICY IF EXISTS "Authenticated users can update checklist categories" ON public.pssr_checklist_categories;

-- Create admin-only policies for pssr_checklist_categories
CREATE POLICY "Admins can insert checklist categories"
ON public.pssr_checklist_categories
FOR INSERT
TO authenticated
WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can update checklist categories"
ON public.pssr_checklist_categories
FOR UPDATE
TO authenticated
USING (public.user_is_admin(auth.uid()))
WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete checklist categories"
ON public.pssr_checklist_categories
FOR DELETE
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- Create admin-only policies for pssr_checklist_items
DROP POLICY IF EXISTS "Anyone can insert checklist items" ON public.pssr_checklist_items;
DROP POLICY IF EXISTS "Anyone can update checklist items" ON public.pssr_checklist_items;
DROP POLICY IF EXISTS "Anyone can delete checklist items" ON public.pssr_checklist_items;
DROP POLICY IF EXISTS "Authenticated users can insert checklist items" ON public.pssr_checklist_items;
DROP POLICY IF EXISTS "Authenticated users can update checklist items" ON public.pssr_checklist_items;
DROP POLICY IF EXISTS "Authenticated users can delete checklist items" ON public.pssr_checklist_items;

CREATE POLICY "Admins can insert checklist items"
ON public.pssr_checklist_items
FOR INSERT
TO authenticated
WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can update checklist items"
ON public.pssr_checklist_items
FOR UPDATE
TO authenticated
USING (public.user_is_admin(auth.uid()))
WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete checklist items"
ON public.pssr_checklist_items
FOR DELETE
TO authenticated
USING (public.user_is_admin(auth.uid()));