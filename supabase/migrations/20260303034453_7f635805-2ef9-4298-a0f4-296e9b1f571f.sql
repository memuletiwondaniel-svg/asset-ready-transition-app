
-- Fix sync_readiness_nodes: use correct p2a_handover_point_status enum values
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
  v_dim_oi UUID;
  v_dim_ti UUID;
  v_dim_di UUID;
  v_dim_ms UUID;
  v_dim_hs UUID;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.projects WHERE id = p_project_id;

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
  -- Correct enum values: PENDING, IN_PROGRESS, READY, SIGNED
  INSERT INTO public.readiness_nodes (project_id, tenant_id, node_type, source_table, source_id, label, description, status, completion_pct, module, dimension_id, confidence_factor, risk_severity)
  SELECT 
    p_project_id, v_tenant, 'p2a_handover_point', 'p2a_handover_points', hp.id,
    COALESCE(hp.vcr_code, hp.name, 'VCR'), hp.description,
    CASE hp.status::text
      WHEN 'SIGNED' THEN 'completed'::readiness_node_status
      WHEN 'READY' THEN 'in_progress'::readiness_node_status
      WHEN 'IN_PROGRESS' THEN 'in_progress'::readiness_node_status
      ELSE 'not_started'::readiness_node_status
    END,
    COALESCE(hp.overall_progress, 0), 'p2a',
    v_dim_di,
    CASE hp.status::text
      WHEN 'SIGNED' THEN 1.0
      WHEN 'READY' THEN 0.9
      WHEN 'IN_PROGRESS' THEN 0.8
      ELSE 0.7
    END,
    'none'
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
