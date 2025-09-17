-- Allow anonymous users to create checklist categories
DROP POLICY IF EXISTS "Authenticated users can create checklist categories" ON public.checklist_categories;
CREATE POLICY "Anyone can create checklist categories" 
ON public.checklist_categories 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Allow anonymous users to create checklist topics  
DROP POLICY IF EXISTS "Authenticated users can create checklist topics" ON public.checklist_topics;
CREATE POLICY "Anyone can create checklist topics" 
ON public.checklist_topics 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);