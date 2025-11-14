-- Drop all existing policies on orm_plans and orm_deliverables to start fresh
DROP POLICY IF EXISTS "Anyone can create plans" ON orm_plans;
DROP POLICY IF EXISTS "ORM leads can update their plans" ON orm_plans;
DROP POLICY IF EXISTS "Users can view ORM plans they are involved in" ON orm_plans;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON orm_deliverables;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON orm_deliverables;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON orm_deliverables;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON orm_deliverables;
DROP POLICY IF EXISTS "ORM leads can manage deliverables" ON orm_deliverables;
DROP POLICY IF EXISTS "Users can view deliverables for their ORMs" ON orm_deliverables;
DROP POLICY IF EXISTS "Assigned users can update their deliverables" ON orm_deliverables;

-- Create security definer function to check plan access without triggering RLS
CREATE OR REPLACE FUNCTION check_orm_plan_access(plan_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orm_plans p
    WHERE p.id = plan_id
    AND (
      p.created_by = user_id
      OR p.orm_lead_id = user_id
      OR user_is_admin(user_id)
    )
  );
$$;

-- Create new non-circular policies for orm_plans
CREATE POLICY "Users can create ORM plans"
  ON orm_plans FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their ORM plans"
  ON orm_plans FOR SELECT
  USING (
    auth.uid() = created_by
    OR auth.uid() = orm_lead_id
    OR user_is_admin(auth.uid())
  );

CREATE POLICY "Users can update their ORM plans"
  ON orm_plans FOR UPDATE
  USING (
    auth.uid() = created_by
    OR auth.uid() = orm_lead_id
    OR user_is_admin(auth.uid())
  );

-- Create new non-circular policies for orm_deliverables
CREATE POLICY "Users can create deliverables"
  ON orm_deliverables FOR INSERT
  WITH CHECK (
    check_orm_plan_access(orm_plan_id, auth.uid())
  );

CREATE POLICY "Users can view deliverables"
  ON orm_deliverables FOR SELECT
  USING (
    auth.uid() = assigned_resource_id
    OR auth.uid() = qaqc_reviewer_id
    OR user_is_admin(auth.uid())
    OR check_orm_plan_access(orm_plan_id, auth.uid())
  );

CREATE POLICY "Users can update deliverables"
  ON orm_deliverables FOR UPDATE
  USING (
    auth.uid() = assigned_resource_id
    OR auth.uid() = qaqc_reviewer_id
    OR check_orm_plan_access(orm_plan_id, auth.uid())
  );

CREATE POLICY "Users can delete deliverables"
  ON orm_deliverables FOR DELETE
  USING (
    check_orm_plan_access(orm_plan_id, auth.uid())
  );