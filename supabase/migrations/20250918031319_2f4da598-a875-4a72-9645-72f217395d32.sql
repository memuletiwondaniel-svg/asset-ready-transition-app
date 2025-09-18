-- Fix RLS policies for checklist_items to allow proper deletion
-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Anyone can update checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Admin users can manage checklist items" ON public.checklist_items;

-- Create new comprehensive policies for checklist_items
-- Allow all authenticated users to update checklist items (including soft delete)
CREATE POLICY "Authenticated users can update checklist items" 
ON public.checklist_items 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow admins full management access
CREATE POLICY "Admin users can manage all checklist items" 
ON public.checklist_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::user_role
  )
);