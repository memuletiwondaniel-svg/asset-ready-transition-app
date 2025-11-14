-- Fix infinite recursion in orm_deliverables RLS policies
-- Drop existing policies that may have circular references
DROP POLICY IF EXISTS "Users can view orm_deliverables" ON public.orm_deliverables;
DROP POLICY IF EXISTS "Users can insert orm_deliverables" ON public.orm_deliverables;
DROP POLICY IF EXISTS "Users can update orm_deliverables" ON public.orm_deliverables;
DROP POLICY IF EXISTS "Users can delete orm_deliverables" ON public.orm_deliverables;

-- Create new simplified policies without circular references
CREATE POLICY "Enable read access for authenticated users"
  ON public.orm_deliverables
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.orm_deliverables
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON public.orm_deliverables
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON public.orm_deliverables
  FOR DELETE
  TO authenticated
  USING (true);