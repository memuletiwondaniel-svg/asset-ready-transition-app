-- Allow anyone (anon and authenticated) to create checklist items
DROP POLICY IF EXISTS "Anyone can create checklist items" ON public.checklist_items;
CREATE POLICY "Anyone can create checklist items"
ON public.checklist_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
