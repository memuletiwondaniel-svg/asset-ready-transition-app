-- =============================================================================
-- RLS performance hardening - auth.uid() subquery optimisation pass 2
-- =============================================================================
-- Audit results:
--   1. auth.uid() subquery check: 0 bare auth.uid() calls found — all 416+
--      policies already use (SELECT auth.uid()) from the first pass.
--   2. Multiple permissive policies: 2 tables have duplicate SELECT policies
--      for the same role, causing unintended OR widening.
--
-- Fix: Remove the overly broad "auth.uid() IS NOT NULL" policies that were
-- created in the unauthenticated-access hardening pass. The tenant-scoped
-- policies on these tables already imply authentication and provide proper
-- data isolation.
--
-- Tables fixed:
--   p2a_handover_plans: drop "Users can view all handover plans" (redundant)
--   project_team_members: drop "Anyone can view project team members" (redundant)
-- =============================================================================

-- p2a_handover_plans: keep tenant-scoped policy, drop broad one
DROP POLICY IF EXISTS "Users can view all handover plans" ON public.p2a_handover_plans;

-- project_team_members: keep tenant-scoped policy, drop broad one
DROP POLICY IF EXISTS "Anyone can view project team members" ON public.project_team_members;