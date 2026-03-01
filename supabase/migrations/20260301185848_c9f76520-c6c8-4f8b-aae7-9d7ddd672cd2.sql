
-- =====================================================
-- PHASE 1A: MULTI-TENANCY FOUNDATION - Tables & Columns
-- =====================================================

-- 1. TENANTS TABLE
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. ADD tenant_id TO PROFILES FIRST (before any policy references it)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);

-- 3. Now create tenants RLS (safe because profiles.tenant_id exists)
CREATE POLICY "Users can view own tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages tenants"
  ON public.tenants FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. SECURITY DEFINER FUNCTION
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- 5. ADD tenant_id TO CORE TABLES
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON public.projects(tenant_id);

ALTER TABLE public.pssrs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_pssrs_tenant_id ON public.pssrs(tenant_id);

ALTER TABLE public.orp_plans ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_orp_plans_tenant_id ON public.orp_plans(tenant_id);

ALTER TABLE public.orm_plans ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_orm_plans_tenant_id ON public.orm_plans(tenant_id);

ALTER TABLE public.p2a_handover_plans ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_p2a_handover_plans_tenant_id ON public.p2a_handover_plans(tenant_id);

ALTER TABLE public.p2a_handovers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_p2a_handovers_tenant_id ON public.p2a_handovers(tenant_id);

ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_tenant_id ON public.user_tasks(tenant_id);

ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_tenant_id ON public.chat_conversations(tenant_id);

ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

ALTER TABLE public.project_team_members ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_tenant_id ON public.project_team_members(tenant_id);

-- 6. AUTO-POPULATE TRIGGER
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_tenant_id_projects
  BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_set_tenant_id_pssrs
  BEFORE INSERT ON public.pssrs FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_set_tenant_id_orp_plans
  BEFORE INSERT ON public.orp_plans FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_set_tenant_id_orm_plans
  BEFORE INSERT ON public.orm_plans FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_set_tenant_id_p2a_handover_plans
  BEFORE INSERT ON public.p2a_handover_plans FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_set_tenant_id_p2a_handovers
  BEFORE INSERT ON public.p2a_handovers FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_set_tenant_id_user_tasks
  BEFORE INSERT ON public.user_tasks FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_set_tenant_id_chat_conversations
  BEFORE INSERT ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_set_tenant_id_project_team_members
  BEFORE INSERT ON public.project_team_members FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- 7. UPDATED_AT TRIGGER FOR TENANTS
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
