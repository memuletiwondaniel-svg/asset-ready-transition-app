-- ⚠️ SECURITY WARNING: Making ORM plans creatable without authentication
-- This allows ANYONE to create ORM plans without being logged in
-- Consider the security implications carefully

-- Update RLS policy to allow anonymous inserts (NOT RECOMMENDED for production)
DROP POLICY IF EXISTS "ORM leads can create plans" ON public.orm_plans;

CREATE POLICY "Anyone can create plans"
  ON public.orm_plans
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow created_by to be null for unauthenticated users
ALTER TABLE public.orm_plans 
  ALTER COLUMN created_by DROP NOT NULL;