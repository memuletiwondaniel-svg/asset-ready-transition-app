
-- ============================================================
-- ORIP SCORING ENGINE: Extend schema for dimension-based scoring
-- ============================================================

-- 1. Extend vcr_item_categories with ORIP scoring fields
ALTER TABLE public.vcr_item_categories 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
  ADD COLUMN IF NOT EXISTS default_weight NUMERIC(5,4) DEFAULT 0.2000,
  ADD COLUMN IF NOT EXISTS confidence_factor_default NUMERIC(3,2) DEFAULT 0.80,
  ADD COLUMN IF NOT EXISTS risk_severity_multiplier NUMERIC(3,1) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS is_readiness_dimension BOOLEAN DEFAULT true;

-- Set tenant_id for existing rows
CREATE TRIGGER set_vcr_item_categories_tenant
  BEFORE INSERT ON public.vcr_item_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- 2. Add dimension_id, confidence_factor, risk_severity to readiness_nodes
ALTER TABLE public.readiness_nodes
  ADD COLUMN IF NOT EXISTS dimension_id UUID REFERENCES public.vcr_item_categories(id),
  ADD COLUMN IF NOT EXISTS confidence_factor NUMERIC(3,2) DEFAULT 0.80,
  ADD COLUMN IF NOT EXISTS risk_severity TEXT DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_readiness_nodes_dimension ON public.readiness_nodes(dimension_id);

-- 3. Add ORIP scoring columns to ori_scores
ALTER TABLE public.ori_scores
  ADD COLUMN IF NOT EXISTS dimension_scores JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_penalty_total NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS startup_confidence_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS schedule_adherence_index NUMERIC(5,4) DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS critical_path_stability_index NUMERIC(5,4) DEFAULT 1.0000;

-- 4. Enhanced calculate_ori_score with ORIP formula
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
  v_dimension_scores JSONB := '{}'::jsonb;
  v_module_scores JSONB := '{}'::jsonb;
  v_overall NUMERIC(5,2) := 0;
  v_total_weight NUMERIC := 0;
  v_node_count INTEGER := 0;
  v_completed INTEGER := 0;
  v_blocked INTEGER := 0;
  v_at_risk INTEGER := 0;
  v_confidence TEXT;
  v_score_id UUID;
  v_risk_penalty NUMERIC := 0;
  v_scs NUMERIC(5,2);
  v_schedule_adherence NUMERIC(5,4) := 1.0;
  v_critical_path_stability NUMERIC(5,4) := 1.0;
  r RECORD;
  d RECORD;
BEGIN
  -- Get weight profile
  IF p_weight_profile_id IS NOT NULL THEN
    SELECT weights INTO v_weights FROM public.ori_weight_profiles WHERE id = p_weight_profile_id;
  END IF;
  IF v_weights IS NULL THEN
    v_weights := '{"ora": 0.25, "p2a": 0.25, "pssr": 0.20, "orm": 0.15, "training": 0.15}'::jsonb;
  END IF;

  -- Calculate per-dimension scores (using vcr_item_categories)
  FOR d IN
    SELECT 
      vc.id AS dim_id,
      vc.code AS dim_code,
      vc.name AS dim_name,
      vc.default_weight AS dim_weight,
      COUNT(rn.id) AS total,
      COUNT(rn.id) FILTER (WHERE rn.status = 'completed') AS done,
      COUNT(rn.id) FILTER (WHERE rn.status = 'blocked') AS blocked_c,
      COUNT(rn.id) FILTER (WHERE rn.status = 'at_risk') AS risk_c,
      COALESCE(AVG(rn.completion_pct), 0) AS avg_pct,
      COALESCE(AVG(rn.confidence_factor), 0.8) AS avg_confidence,
      -- Risk penalty: sum severity multipliers for blocked/at_risk nodes
      COALESCE(SUM(CASE 
        WHEN rn.risk_severity = 'startup_blocking' THEN 3.0
        WHEN rn.risk_severity = 'major' THEN 2.0
        WHEN rn.risk_severity = 'moderate' THEN 1.0
        WHEN rn.risk_severity = 'minor' THEN 0.5
        ELSE 0
      END), 0) AS raw_risk_penalty
    FROM public.vcr_item_categories vc
    LEFT JOIN public.readiness_nodes rn 
      ON rn.dimension_id = vc.id AND rn.project_id = p_project_id
    WHERE vc.is_active = true AND vc.is_readiness_dimension = true
    GROUP BY vc.id, vc.code, vc.name, vc.default_weight
  LOOP
    IF d.total > 0 THEN
      -- DS_i = (avg completion %) × confidence factor
      DECLARE
        v_ds NUMERIC;
        v_dim_risk NUMERIC;
      BEGIN
        v_ds := (d.avg_pct * d.avg_confidence) / 100.0 * 100.0;
        -- Cap per-dimension risk penalty at 15 points
        v_dim_risk := LEAST(d.raw_risk_penalty, 15.0);
        
        v_dimension_scores := v_dimension_scores || jsonb_build_object(
          d.dim_code, jsonb_build_object(
            'name', d.dim_name,
            'score', ROUND(v_ds, 2),
            'raw_score', ROUND(d.avg_pct::numeric, 2),
            'confidence', ROUND(d.avg_confidence::numeric, 2),
            'risk_penalty', ROUND(v_dim_risk, 2),
            'total', d.total,
            'completed', d.done,
            'blocked', d.blocked_c,
            'at_risk', d.risk_c,
            'weight', d.dim_weight
          )
        );
        
        -- Weighted contribution
        v_overall := v_overall + (v_ds * COALESCE(d.dim_weight, 0.2));
        v_total_weight := v_total_weight + COALESCE(d.dim_weight, 0.2);
        v_risk_penalty := v_risk_penalty + v_dim_risk;
      END;
    END IF;
    
    v_node_count := v_node_count + d.total;
    v_completed := v_completed + d.done;
    v_blocked := v_blocked + d.blocked_c;
    v_at_risk := v_at_risk + d.risk_c;
  END LOOP;

  -- Also include module-based scores for backward compatibility
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
    
    -- If no dimension-based nodes, fall back to module weights
    IF v_total_weight = 0 THEN
      v_overall := v_overall + (r.avg_pct * COALESCE((v_weights->>r.module)::numeric, 0));
      v_total_weight := v_total_weight + COALESCE((v_weights->>r.module)::numeric, 0);
      v_node_count := v_node_count + r.total;
      v_completed := v_completed + r.done;
      v_blocked := v_blocked + r.blocked_c;
      v_at_risk := v_at_risk + r.risk_c;
    END IF;
  END LOOP;

  -- Normalize ORI
  IF v_total_weight > 0 THEN
    v_overall := ROUND(v_overall / v_total_weight, 2);
  END IF;

  -- Apply global risk penalty (capped at 15%)
  v_risk_penalty := LEAST(v_risk_penalty, 15.0);
  v_overall := GREATEST(v_overall - v_risk_penalty, 0);

  -- Critical path stability: ratio of non-blocked to total
  IF v_node_count > 0 THEN
    v_critical_path_stability := ROUND(1.0 - (v_blocked::numeric / v_node_count), 4);
  END IF;

  -- Schedule adherence: ratio of completed to expected (simplified)
  IF v_node_count > 0 THEN
    v_schedule_adherence := ROUND(LEAST(v_completed::numeric / GREATEST(v_node_count * 0.5, 1), 1.0), 4);
  END IF;

  -- Startup Confidence Score
  v_scs := ROUND(v_overall * v_schedule_adherence * v_critical_path_stability, 2);

  -- Confidence level
  v_confidence := CASE
    WHEN v_blocked > 0 OR v_at_risk > (v_node_count * 0.2) THEN 'low'
    WHEN v_at_risk > 0 OR v_overall < 50 THEN 'medium'
    ELSE 'high'
  END;

  INSERT INTO public.ori_scores (
    project_id, weight_profile_id, overall_score, module_scores,
    dimension_scores, risk_penalty_total, startup_confidence_score,
    schedule_adherence_index, critical_path_stability_index,
    node_count, completed_count, blocked_count, at_risk_count,
    confidence_level, snapshot_type, calculated_by
  ) VALUES (
    p_project_id, p_weight_profile_id, v_overall, v_module_scores,
    v_dimension_scores, v_risk_penalty, v_scs,
    v_schedule_adherence, v_critical_path_stability,
    v_node_count, v_completed, v_blocked, v_at_risk,
    v_confidence, p_snapshot_type, auth.uid()
  ) RETURNING id INTO v_score_id;

  RETURN jsonb_build_object(
    'score_id', v_score_id,
    'overall_score', v_overall,
    'startup_confidence_score', v_scs,
    'dimension_scores', v_dimension_scores,
    'module_scores', v_module_scores,
    'risk_penalty_total', v_risk_penalty,
    'node_count', v_node_count,
    'completed_count', v_completed,
    'blocked_count', v_blocked,
    'at_risk_count', v_at_risk,
    'confidence_level', v_confidence,
    'schedule_adherence_index', v_schedule_adherence,
    'critical_path_stability_index', v_critical_path_stability
  );
END;
$$;

-- 5. Enhanced sync_readiness_nodes with dimension assignment and confidence factors
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
  v_dim_oi UUID; -- Operating Integrity
  v_dim_ti UUID; -- Technical Integrity
  v_dim_di UUID; -- Design Integrity
  v_dim_ms UUID; -- Management Systems
  v_dim_hs UUID; -- Health & Safety
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.projects WHERE id = p_project_id;

  -- Resolve dimension IDs
  SELECT id INTO v_dim_oi FROM public.vcr_item_categories WHERE code = 'OI' AND is_active = true LIMIT 1;
  SELECT id INTO v_dim_ti FROM public.vcr_item_categories WHERE code = 'TI' AND is_active = true LIMIT 1;
  SELECT id INTO v_dim_di FROM public.vcr_item_categories WHERE code = 'DI2' AND is_active = true LIMIT 1;
  SELECT id INTO v_dim_ms FROM public.vcr_item_categories WHERE code = 'MS' AND is_active = true LIMIT 1;
  SELECT id INTO v_dim_hs FROM public.vcr_item_categories WHERE code = 'HS' AND is_active = true LIMIT 1;

  -- Sync ORA Plan Activities → Operating Integrity
  INSERT INTO public.readiness_nodes (project_id, tenant_id, node_type, source_table, source_id, label, description, status, completion_pct, module, phase, dimension_id, confidence_factor, risk_severity)
  SELECT 
    p_project_id, v_tenant, 'ora_activity', 'ora_plan_activities', a.id,
    a.name, a.description,
    CASE a.status 
      WHEN 'COMPLETED' THEN 'completed'::readiness_node_status
      WHEN 'IN_PROGRESS' THEN 'in_progress'::readiness_node_status
      ELSE 'not_started'::readiness_node_status
    END,
    COALESCE(a.completion_percentage, 0),
    'ora', a.activity_code,
    v_dim_oi,
    CASE a.status WHEN 'COMPLETED' THEN 1.0 WHEN 'IN_PROGRESS' THEN 0.8 ELSE 0.7 END,
    'none'
  FROM public.ora_plan_activities a
  JOIN public.orp_plans op ON a.orp_plan_id = op.id
  WHERE op.project_id = p_project_id
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct,
    label = EXCLUDED.label, dimension_id = EXCLUDED.dimension_id,
    confidence_factor = EXCLUDED.confidence_factor, updated_at = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- Sync P2A Handover Points → Design Integrity
  INSERT INTO public.readiness_nodes (project_id, tenant_id, node_type, source_table, source_id, label, description, status, completion_pct, module, dimension_id, confidence_factor, risk_severity)
  SELECT 
    p_project_id, v_tenant, 'p2a_handover_point', 'p2a_handover_points', hp.id,
    COALESCE(hp.vcr_code, hp.name, 'VCR'), hp.description,
    CASE hp.status 
      WHEN 'COMPLETED' THEN 'completed'::readiness_node_status
      WHEN 'IN_PROGRESS' THEN 'in_progress'::readiness_node_status
      WHEN 'BLOCKED' THEN 'blocked'::readiness_node_status
      ELSE 'not_started'::readiness_node_status
    END,
    COALESCE(hp.overall_progress, 0), 'p2a',
    v_dim_di,
    CASE hp.status WHEN 'COMPLETED' THEN 1.0 WHEN 'IN_PROGRESS' THEN 0.8 WHEN 'BLOCKED' THEN 0.7 ELSE 0.7 END,
    CASE hp.status WHEN 'BLOCKED' THEN 'major' ELSE 'none' END
  FROM public.p2a_handover_points hp
  JOIN public.p2a_handover_plans pl ON hp.handover_plan_id = pl.id
  WHERE pl.project_id = p_project_id
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct,
    label = EXCLUDED.label, dimension_id = EXCLUDED.dimension_id,
    confidence_factor = EXCLUDED.confidence_factor, risk_severity = EXCLUDED.risk_severity, updated_at = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- Sync PSSRs → Health & Safety
  INSERT INTO public.readiness_nodes (project_id, tenant_id, node_type, source_table, source_id, label, description, status, completion_pct, module, dimension_id, confidence_factor, risk_severity)
  SELECT 
    p_project_id, v_tenant, 'pssr', 'pssrs', p.id,
    COALESCE(p.pssr_id, p.title), p.description,
    CASE p.status
      WHEN 'COMPLETED' THEN 'completed'::readiness_node_status
      WHEN 'SOF_APPROVED' THEN 'completed'::readiness_node_status
      WHEN 'APPROVED' THEN 'completed'::readiness_node_status
      WHEN 'IN_PROGRESS' THEN 'in_progress'::readiness_node_status
      WHEN 'UNDER_REVIEW' THEN 'in_progress'::readiness_node_status
      ELSE 'not_started'::readiness_node_status
    END,
    COALESCE(p.progress_percentage, 0), 'pssr',
    v_dim_hs,
    CASE p.status WHEN 'COMPLETED' THEN 1.0 WHEN 'SOF_APPROVED' THEN 1.0 WHEN 'APPROVED' THEN 1.0 WHEN 'IN_PROGRESS' THEN 0.8 WHEN 'UNDER_REVIEW' THEN 0.8 ELSE 0.7 END,
    'none'
  FROM public.pssrs p
  WHERE p.project_id = p_project_id
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct,
    label = EXCLUDED.label, dimension_id = EXCLUDED.dimension_id,
    confidence_factor = EXCLUDED.confidence_factor, updated_at = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- Sync ORM Deliverables → Management Systems
  INSERT INTO public.readiness_nodes (project_id, tenant_id, node_type, source_table, source_id, label, status, completion_pct, module, dimension_id, confidence_factor, risk_severity)
  SELECT 
    op.project_id, v_tenant, 'orm_deliverable', 'orm_deliverables', d.id,
    d.deliverable_type::text,
    CASE d.workflow_stage
      WHEN 'completed' THEN 'completed'::readiness_node_status
      WHEN 'in_review' THEN 'in_progress'::readiness_node_status
      WHEN 'in_progress' THEN 'in_progress'::readiness_node_status
      ELSE 'not_started'::readiness_node_status
    END,
    COALESCE(d.progress_percentage, 0), 'orm',
    v_dim_ms,
    CASE d.workflow_stage WHEN 'completed' THEN 1.0 WHEN 'in_review' THEN 0.8 WHEN 'in_progress' THEN 0.8 ELSE 0.7 END,
    'none'
  FROM public.orm_deliverables d
  JOIN public.orm_plans op ON d.orm_plan_id = op.id
  WHERE op.project_id = p_project_id
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct,
    dimension_id = EXCLUDED.dimension_id, confidence_factor = EXCLUDED.confidence_factor, updated_at = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- Sync Training Items → Technical Integrity
  INSERT INTO public.readiness_nodes (project_id, tenant_id, node_type, source_table, source_id, label, description, status, completion_pct, module, dimension_id, confidence_factor, risk_severity)
  SELECT 
    op.project_id, v_tenant, 'training_item', 'ora_training_items', ti.id,
    ti.title, ti.overview,
    CASE 
      WHEN ti.completion_date IS NOT NULL THEN 'completed'::readiness_node_status
      WHEN ti.scheduled_date IS NOT NULL THEN 'in_progress'::readiness_node_status
      ELSE 'not_started'::readiness_node_status
    END,
    CASE WHEN ti.completion_date IS NOT NULL THEN 100 ELSE 0 END, 'training',
    v_dim_ti,
    CASE WHEN ti.completion_date IS NOT NULL THEN 1.0 WHEN ti.scheduled_date IS NOT NULL THEN 0.8 ELSE 0.7 END,
    'none'
  FROM public.ora_training_items ti
  JOIN public.ora_training_plans tp ON ti.training_plan_id = tp.id
  JOIN public.orp_plans op ON tp.ora_plan_id = op.id
  WHERE op.project_id = p_project_id
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct,
    label = EXCLUDED.label, dimension_id = EXCLUDED.dimension_id,
    confidence_factor = EXCLUDED.confidence_factor, updated_at = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  RETURN v_count;
END;
$$;
