-- Allow authenticated users to insert new checklist categories
CREATE POLICY "Authenticated users can create checklist categories" 
ON public.checklist_categories 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert new checklist topics
CREATE POLICY "Authenticated users can create checklist topics" 
ON public.checklist_topics 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);