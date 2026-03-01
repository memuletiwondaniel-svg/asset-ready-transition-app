
-- =====================================================
-- PHASE 1B: TENANT-SCOPED RLS POLICIES ON CORE TABLES
-- =====================================================

-- === PROJECTS ===
DROP POLICY IF EXISTS "Users can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

CREATE POLICY "Tenant: view projects"
  ON public.projects FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: insert projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: update projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: delete projects"
  ON public.projects FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

-- === USER_TASKS ===
DROP POLICY IF EXISTS "Users can view own tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Authenticated users can view all tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.user_tasks;

CREATE POLICY "Tenant: view tasks"
  ON public.user_tasks FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: insert tasks"
  ON public.user_tasks FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: update tasks"
  ON public.user_tasks FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: delete tasks"
  ON public.user_tasks FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

-- === PSSRS ===
DROP POLICY IF EXISTS "Users can view own pssrs" ON public.pssrs;
DROP POLICY IF EXISTS "Users can insert pssrs" ON public.pssrs;
DROP POLICY IF EXISTS "Users can update own pssrs" ON public.pssrs;
DROP POLICY IF EXISTS "Authenticated users can view pssrs" ON public.pssrs;
DROP POLICY IF EXISTS "Users can view pssrs they created or lead" ON public.pssrs;
DROP POLICY IF EXISTS "Users can update pssrs they created or lead" ON public.pssrs;

CREATE POLICY "Tenant: view pssrs"
  ON public.pssrs FOR SELECT TO authenticated
  USING (
    (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL)
    AND (user_id = auth.uid() OR pssr_lead_id = auth.uid() OR public.user_is_admin(auth.uid()))
  );

CREATE POLICY "Tenant: insert pssrs"
  ON public.pssrs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: update pssrs"
  ON public.pssrs FOR UPDATE TO authenticated
  USING (
    (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL)
    AND (user_id = auth.uid() OR pssr_lead_id = auth.uid() OR public.user_is_admin(auth.uid()))
  );

-- === ORP_PLANS ===
DROP POLICY IF EXISTS "Users can view ORP plans" ON public.orp_plans;
DROP POLICY IF EXISTS "Users can insert ORP plans" ON public.orp_plans;
DROP POLICY IF EXISTS "Users can update ORP plans" ON public.orp_plans;
DROP POLICY IF EXISTS "Users can delete ORP plans" ON public.orp_plans;
DROP POLICY IF EXISTS "Authenticated users can view ORP plans" ON public.orp_plans;
DROP POLICY IF EXISTS "Authenticated users can create ORP plans" ON public.orp_plans;
DROP POLICY IF EXISTS "Authenticated users can update ORP plans" ON public.orp_plans;
DROP POLICY IF EXISTS "Authenticated users can delete ORP plans" ON public.orp_plans;

CREATE POLICY "Tenant: view orp plans"
  ON public.orp_plans FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: insert orp plans"
  ON public.orp_plans FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: update orp plans"
  ON public.orp_plans FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: delete orp plans"
  ON public.orp_plans FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

-- === P2A_HANDOVER_PLANS ===
DROP POLICY IF EXISTS "Authenticated users can view handover plans" ON public.p2a_handover_plans;
DROP POLICY IF EXISTS "Authenticated users can insert handover plans" ON public.p2a_handover_plans;
DROP POLICY IF EXISTS "Authenticated users can update handover plans" ON public.p2a_handover_plans;
DROP POLICY IF EXISTS "Authenticated users can delete handover plans" ON public.p2a_handover_plans;
DROP POLICY IF EXISTS "Users can view handover plans" ON public.p2a_handover_plans;
DROP POLICY IF EXISTS "Users can create handover plans" ON public.p2a_handover_plans;
DROP POLICY IF EXISTS "Users can update handover plans" ON public.p2a_handover_plans;
DROP POLICY IF EXISTS "Users can delete handover plans" ON public.p2a_handover_plans;

CREATE POLICY "Tenant: view p2a plans"
  ON public.p2a_handover_plans FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: insert p2a plans"
  ON public.p2a_handover_plans FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: update p2a plans"
  ON public.p2a_handover_plans FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: delete p2a plans"
  ON public.p2a_handover_plans FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

-- === PROJECT_TEAM_MEMBERS ===
DROP POLICY IF EXISTS "Users can view project team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Users can insert project team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Users can update project team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Users can delete project team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Authenticated users can view project team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Authenticated users can manage project team members" ON public.project_team_members;

CREATE POLICY "Tenant: view team members"
  ON public.project_team_members FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: insert team members"
  ON public.project_team_members FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: update team members"
  ON public.project_team_members FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: delete team members"
  ON public.project_team_members FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

-- === CHAT_CONVERSATIONS ===
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.chat_conversations;

CREATE POLICY "Tenant: view conversations"
  ON public.chat_conversations FOR SELECT TO authenticated
  USING ((tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL) AND user_id = auth.uid());

CREATE POLICY "Tenant: insert conversations"
  ON public.chat_conversations FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant: update conversations"
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING ((tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL) AND user_id = auth.uid());

CREATE POLICY "Tenant: delete conversations"
  ON public.chat_conversations FOR DELETE TO authenticated
  USING ((tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL) AND user_id = auth.uid());

-- === PROFILES (tenant-scoped visibility) ===
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view active profiles" ON public.profiles;

CREATE POLICY "Tenant: view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL OR user_id = auth.uid());
