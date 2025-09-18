-- Fix RLS policies to allow anonymous users to update checklist items
-- This matches the existing pattern where anonymous users can create and view items

-- Drop the restrictive authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can update checklist items" ON public.checklist_items;

-- Create a policy that allows anyone to update checklist items (matching the original "Anyone can update" pattern)
CREATE POLICY "Anyone can update checklist items" 
ON public.checklist_items 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Keep the admin policy for comprehensive management
-- (This policy already exists and should remain)