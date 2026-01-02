-- Allow authenticated users to insert new categories
CREATE POLICY "Authenticated users can insert checklist categories"
ON public.pssr_checklist_categories
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update categories
CREATE POLICY "Authenticated users can update checklist categories"
ON public.pssr_checklist_categories
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);