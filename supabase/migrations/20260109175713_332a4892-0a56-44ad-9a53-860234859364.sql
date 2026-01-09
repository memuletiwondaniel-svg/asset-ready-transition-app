-- Drop the restrictive SELECT policy on orp_approvals
DROP POLICY IF EXISTS "Users can view approvals" ON orp_approvals;

-- Create a more permissive SELECT policy that allows viewing all approvals for readable plans
CREATE POLICY "Users can view all approvals" ON orp_approvals
  FOR SELECT USING (true);