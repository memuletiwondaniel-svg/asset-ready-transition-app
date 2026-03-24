-- ═══════════════════════════════════════════════════════════════
-- IVAN: Process Technical Authority Agent — 3 new tables + registry
-- ═══════════════════════════════════════════════════════════════

-- Table 1: stq_register
CREATE TABLE public.stq_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  stq_number VARCHAR(50),
  title VARCHAR(500),
  description TEXT,
  discipline VARCHAR(50),
  raised_by UUID,
  raised_date DATE,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','closed','deferred')),
  technical_response TEXT,
  ivan_adequacy_assessment TEXT,
  design_deviation_impact TEXT,
  risk_score INTEGER DEFAULT 0,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stq_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stq_register"
  ON public.stq_register FOR SELECT TO authenticated
  USING (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

CREATE POLICY "Authenticated users can insert stq_register"
  ON public.stq_register FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

CREATE POLICY "Admin or ORA lead can update stq_register"
  ON public.stq_register FOR UPDATE TO authenticated
  USING (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

CREATE INDEX idx_stq_register_project ON public.stq_register(project_id);
CREATE INDEX idx_stq_register_tenant ON public.stq_register(tenant_id);
CREATE INDEX idx_stq_register_status ON public.stq_register(status);

-- Table 2: moc_register
CREATE TABLE public.moc_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  moc_number VARCHAR(50),
  title VARCHAR(500),
  description TEXT,
  change_type VARCHAR(100),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','closed','cancelled')),
  actions_total INTEGER DEFAULT 0,
  actions_complete INTEGER DEFAULT 0,
  ivan_closeout_assessment TEXT,
  new_hazard_introduced BOOLEAN DEFAULT FALSE,
  startup_risk_flag BOOLEAN DEFAULT FALSE,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.moc_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read moc_register"
  ON public.moc_register FOR SELECT TO authenticated
  USING (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

CREATE POLICY "Authenticated users can insert moc_register"
  ON public.moc_register FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

CREATE POLICY "Admin or ORA lead can update moc_register"
  ON public.moc_register FOR UPDATE TO authenticated
  USING (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

CREATE INDEX idx_moc_register_project ON public.moc_register(project_id);
CREATE INDEX idx_moc_register_tenant ON public.moc_register(tenant_id);
CREATE INDEX idx_moc_register_status ON public.moc_register(status);

-- Table 3: override_register
CREATE TABLE public.override_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  system_name VARCHAR(200),
  override_description TEXT,
  sif_tag VARCHAR(100),
  override_reason TEXT,
  raised_by UUID,
  raised_date DATE,
  authorised_by UUID,
  expected_removal_date DATE,
  actual_removal_date DATE,
  risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','removed')),
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.override_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read override_register"
  ON public.override_register FOR SELECT TO authenticated
  USING (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

CREATE POLICY "Authenticated users can insert override_register"
  ON public.override_register FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

CREATE POLICY "Admin or ORA lead can update override_register"
  ON public.override_register FOR UPDATE TO authenticated
  USING (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

CREATE INDEX idx_override_register_project ON public.override_register(project_id);
CREATE INDEX idx_override_register_tenant ON public.override_register(tenant_id);
CREATE INDEX idx_override_register_status ON public.override_register(status);

-- Register Ivan in ai_agent_registry
INSERT INTO public.ai_agent_registry (agent_code, display_name, model_id, status, domain_tags, tools_count, description)
VALUES (
  'ivan',
  'Ivan',
  'claude-sonnet-4-5',
  'active',
  ARRAY['hazop','hazop_closeout','process_safety','pid_review','hemp','operating_procedures','simops','omar','commissioning_review','startup_procedures','flow_assurance','technical_authority','process_engineering','stq','moc','operational_registers','override_register','cumulative_risk','safeguarding_memorandum'],
  17,
  'Ivan is ORSH''s Process Technical Authority Agent. He conducts HAZOPs, reviews P&IDs, assesses STQs and MOCs, develops operational registers, and performs cumulative startup risk assessments.'
);