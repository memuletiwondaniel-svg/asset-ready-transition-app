-- Add UPDATE policy for checklist items
CREATE POLICY "Anyone can update checklist items" 
ON public.checklist_items 
FOR UPDATE 
USING (true)
WITH CHECK (true);