
-- ============================================================
-- READINESS ONTOLOGY ENGINE
-- ============================================================

CREATE TYPE public.readiness_node_type AS ENUM (
  'ora_activity', 'p2a_handover_point', 'p2a_system', 'pssr',
  'pssr_checklist_item', 'orm_deliverable', 'orm_milestone',
  'training_item', 'certificate', 'custom'
);

CREATE TYPE public.readiness_node_status AS ENUM (
  'not_started', 'in_progress', 'completed', 'blocked', 'at_risk', 'na'
);

CREATE TYPE public.dependency_type AS ENUM (
  'blocks', 'gates', 'informs', 'requires'
);

CREATE TABLE public.readiness_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  node_type readiness_node_type NOT NULL,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  status readiness_node_status NOT NULL DEFAULT 'not_started',
  completion_pct INTEGER DEFAULT 0 CHECK (completion_pct >= 0 AND completion_pct <= 100),
  weight NUMERIC(5,2) DEFAULT 1.0,
  module TEXT NOT NULL,
  phase TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_table, source_id)
);

CREATE TABLE public.readiness_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES public.readiness_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES public.readiness_nodes(id) ON DELETE CASCADE,
  dependency_type dependency_type NOT NULL DEFAULT 'blocks',
  description TEXT,
  is_critical BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_node_id, to_node_id),
  CHECK (from_node_id != to_node_id)
);

CREATE INDEX idx_readiness_nodes_project ON public.readiness_nodes(project_id);
CREATE INDEX idx_readiness_nodes_module ON public.readiness_nodes(module);
CREATE INDEX idx_readiness_nodes_status ON public.readiness_nodes(status);
CREATE INDEX idx_readiness_nodes_source ON public.readiness_nodes(source_table, source_id);
CREATE INDEX idx_readiness_deps_from ON public.readiness_dependencies(from_node_id);
CREATE INDEX idx_readiness_deps_to ON public.readiness_dependencies(to_node_id);
CREATE INDEX idx_readiness_deps_project ON public.readiness_dependencies(project_id);

CREATE TRIGGER set_readiness_nodes_tenant
  BEFORE INSERT ON public.readiness_nodes
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE OR REPLACE FUNCTION public.update_readiness_node_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_readiness_nodes_updated
  BEFORE UPDATE ON public.readiness_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_readiness_node_timestamp();

ALTER TABLE public.readiness_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view readiness nodes"
  ON public.readiness_nodes FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can manage readiness nodes"
  ON public.readiness_nodes FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can view dependencies"
  ON public.readiness_dependencies FOR SELECT TO authenticated
  USING (project_id IN (SELECT project_id FROM public.readiness_nodes WHERE tenant_id = public.get_user_tenant_id()));

CREATE POLICY "Tenant users can manage dependencies"
  ON public.readiness_dependencies FOR ALL TO authenticated
  USING (project_id IN (SELECT project_id FROM public.readiness_nodes WHERE tenant_id = public.get_user_tenant_id()))
  WITH CHECK (project_id IN (SELECT project_id FROM public.readiness_nodes WHERE tenant_id = public.get_user_tenant_id()));

-- ============================================================
-- ORI SCORING ENGINE
-- ============================================================

CREATE TABLE public.ori_weight_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  weights JSONB NOT NULL DEFAULT '{"ora": 0.25, "p2a": 0.25, "pssr": 0.20, "orm": 0.15, "training": 0.15}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ori_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  weight_profile_id UUID REFERENCES public.ori_weight_profiles(id),
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  module_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  node_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  blocked_count INTEGER DEFAULT 0,
  at_risk_count INTEGER DEFAULT 0,
  critical_path_score NUMERIC(5,2),
  schedule_variance_days INTEGER,
  confidence_level TEXT,
  snapshot_type TEXT NOT NULL DEFAULT 'auto',
  notes TEXT,
  calculated_by UUID,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ori_scores_project ON public.ori_scores(project_id);
CREATE INDEX idx_ori_scores_calculated ON public.ori_scores(calculated_at DESC);
CREATE INDEX idx_ori_weight_profiles_tenant ON public.ori_weight_profiles(tenant_id);

CREATE TRIGGER set_ori_scores_tenant
  BEFORE INSERT ON public.ori_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE TRIGGER set_ori_weight_profiles_tenant
  BEFORE INSERT ON public.ori_weight_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

ALTER TABLE public.ori_weight_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ori_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view weight profiles"
  ON public.ori_weight_profiles FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Tenant users can manage weight profiles"
  ON public.ori_weight_profiles FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can view ORI scores"
  ON public.ori_scores FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can insert ORI scores"
  ON public.ori_scores FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- ORI CALCULATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_ori_score(
  p_project_id UUID,
  p_weight_profile_id UUID DEFAULT NULL,
  p_snapshot_type TEXT DEFAULT 'auto'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_weights JSONB;
  v_module_scores JSONB := '{}'::jsonb;
  v_overall NUMERIC(5,2) := 0;
  v_total_weight NUMERIC := 0;
  v_node_count INTEGER := 0;
  v_completed INTEGER := 0;
  v_blocked INTEGER := 0;
  v_at_risk INTEGER := 0;
  v_confidence TEXT;
  v_score_id UUID;
  r RECORD;
BEGIN
  IF p_weight_profile_id IS NOT NULL THEN
    SELECT weights INTO v_weights FROM public.ori_weight_profiles WHERE id = p_weight_profile_id;
  END IF;
  
  IF v_weights IS NULL THEN
    v_weights := '{"ora": 0.25, "p2a": 0.25, "pssr": 0.20, "orm": 0.15, "training": 0.15}'::jsonb;
  END IF;

  FOR r IN
    SELECT 
      module,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'completed') AS done,
      COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_c,
      COUNT(*) FILTER (WHERE status = 'at_risk') AS risk_c,
      COALESCE(AVG(completion_pct), 0) AS avg_pct
    FROM public.readiness_nodes
    WHERE project_id = p_project_id
    GROUP BY module
  LOOP
    v_module_scores := v_module_scores || jsonb_build_object(
      r.module, jsonb_build_object(
        'score', ROUND(r.avg_pct::numeric, 2),
        'total', r.total,
        'completed', r.done,
        'blocked', r.blocked_c,
        'at_risk', r.risk_c
      )
    );
    
    v_node_count := v_node_count + r.total;
    v_completed := v_completed + r.done;
    v_blocked := v_blocked + r.blocked_c;
    v_at_risk := v_at_risk + r.risk_c;
    
    v_overall := v_overall + (r.avg_pct * COALESCE((v_weights->>r.module)::numeric, 0));
    v_total_weight := v_total_weight + COALESCE((v_weights->>r.module)::numeric, 0);
  END LOOP;

  IF v_total_weight > 0 THEN
    v_overall := ROUND(v_overall / v_total_weight, 2);
  END IF;

  v_confidence := CASE
    WHEN v_blocked > 0 OR v_at_risk > (v_node_count * 0.2) THEN 'low'
    WHEN v_at_risk > 0 OR v_overall < 50 THEN 'medium'
    ELSE 'high'
  END;

  INSERT INTO public.ori_scores (
    project_id, weight_profile_id, overall_score, module_scores,
    node_count, completed_count, blocked_count, at_risk_count,
    confidence_level, snapshot_type, calculated_by
  ) VALUES (
    p_project_id, p_weight_profile_id, v_overall, v_module_scores,
    v_node_count, v_completed, v_blocked, v_at_risk,
    v_confidence, p_snapshot_type, auth.uid()
  ) RETURNING id INTO v_score_id;

  RETURN jsonb_build_object(
    'score_id', v_score_id,
    'overall_score', v_overall,
    'module_scores', v_module_scores,
    'node_count', v_node_count,
    'completed_count', v_completed,
    'blocked_count', v_blocked,
    'at_risk_count', v_at_risk,
    'confidence_level', v_confidence
  );
END;
$$;

-- ============================================================
-- SYNC FUNCTION — pulls existing module data into readiness_nodes
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_readiness_nodes(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER := 0;
  v_tenant UUID;
  v_rows INTEGER;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.projects WHERE id = p_project_id;

  -- Sync ORA Plan Activities
  INSERT INTO public.readiness_nodes (project_id, tenant_id, node_type, source_table, source_id, label, description, status, completion_pct, module, phase)
  SELECT 
    p_project_id, v_tenant, 'ora_activity', 'ora_plan_activities', a.id,
    a.name, a.description,
    CASE a.status 
      WHEN 'COMPLETED' THEN 'completed'::readiness_node_status
      WHEN 'IN_PROGRESS' THEN 'in_progress'::readiness_node_status
      ELSE 'not_started'::readiness_node_status
    END,
    COALESCE(a.completion_percentage, 0),
    'ora', a.activity_code
  FROM public.ora_plan_activities a
  JOIN public.orp_plans op ON a.orp_plan_id = op.id
  WHERE op.project_id = p_project_id
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct,
    label = EXCLUDED.label, updated_at = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- Sync P2A Handover Points
  INSERT INTO public.readiness_nodes (project_id, tenant_id, node_type, source_table, source_id, label, description, status, completion_pct, module)
  SELECT 
    p_project_id, v_tenant, 'p2a_handover_point', 'p2a_handover_points', hp.id,
    COALESCE(hp.vcr_code, hp.name, 'VCR'), hp.description,
    CASE hp.status 
      WHEN 'COMPLETED' THEN 'completed'::readiness_node_status
      WHEN 'IN_PROGRESS' THEN 'in_progress'::readiness_node_status
      WHEN 'BLOCKED' THEN 'blocked'::readiness_node_status
      ELSE 'not_started'::readiness_node_status
    END,
    COALESCE(hp.overall_progress, 0), 'p2a'
  FROM public.p2a_handover_points hp
  JOIN public.p2a_handover_plans pl ON hp.handover_plan_id = pl.id
  WHERE pl.project_id = p_project_id
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct,
    label = EXCLUDED.label, updated_at = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- Sync PSSRs
  INSERT INTO public.readiness_nodes (project_id, tenant_id, node_type, source_table, source_id, label, description, status, completion_pct, module)
  SELECT 
    p_project_id, v_tenant, 'pssr', 'pssrs', p.id,
    COALESCE(p.pssr_id, p.title), p.description,
    CASE p.status
      WHEN 'COMPLETED' THEN 'completed'::readiness_node_status
      WHEN 'SOF_APPROVED' THEN 'completed'::readiness_node_status
      WHEN 'APPROVED' THEN 'completed'::readiness_node_status
      WHEN 'IN_PROGRESS' THEN 'in_progress'::readiness_node_status
      ELSE 'not_started'::readiness_node_status
    END,
    COALESCE(p.progress_percentage, 0), 'pssr'
  FROM public.pssrs p
  WHERE p.project_id = p_project_id
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct,
    label = EXCLUDED.label, updated_at = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- Sync ORM Deliverables
  INSERT INTO public.readiness_nodes (project_id, tenant_id, node_type, source_table, source_id, label, status, completion_pct, module)
  SELECT 
    op.project_id, v_tenant, 'orm_deliverable', 'orm_deliverables', d.id,
    d.deliverable_type::text,
    CASE d.workflow_stage
      WHEN 'completed' THEN 'completed'::readiness_node_status
      WHEN 'in_review' THEN 'in_progress'::readiness_node_status
      WHEN 'in_progress' THEN 'in_progress'::readiness_node_status
      ELSE 'not_started'::readiness_node_status
    END,
    COALESCE(d.progress_percentage, 0), 'orm'
  FROM public.orm_deliverables d
  JOIN public.orm_plans op ON d.orm_plan_id = op.id
  WHERE op.project_id = p_project_id
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct, updated_at = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- Sync Training Items
  INSERT INTO public.readiness_nodes (project_id, tenant_id, node_type, source_table, source_id, label, description, status, completion_pct, module)
  SELECT 
    op.project_id, v_tenant, 'training_item', 'ora_training_items', ti.id,
    ti.title, ti.overview,
    CASE 
      WHEN ti.completion_date IS NOT NULL THEN 'completed'::readiness_node_status
      WHEN ti.scheduled_date IS NOT NULL THEN 'in_progress'::readiness_node_status
      ELSE 'not_started'::readiness_node_status
    END,
    CASE WHEN ti.completion_date IS NOT NULL THEN 100 ELSE 0 END, 'training'
  FROM public.ora_training_items ti
  JOIN public.ora_training_plans tp ON ti.training_plan_id = tp.id
  JOIN public.orp_plans op ON tp.ora_plan_id = op.id
  WHERE op.project_id = p_project_id
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct,
    label = EXCLUDED.label, updated_at = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  RETURN v_count;
END;
$$;

-- Insert default weight profile
INSERT INTO public.ori_weight_profiles (name, description, is_default, weights)
VALUES (
  'Standard Brownfield',
  'Default weight profile for brownfield operational readiness projects',
  true,
  '{"ora": 0.25, "p2a": 0.25, "pssr": 0.20, "orm": 0.15, "training": 0.15}'::jsonb
);
