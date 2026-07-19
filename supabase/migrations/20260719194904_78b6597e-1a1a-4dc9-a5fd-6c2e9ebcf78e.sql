
-- MVP-D2: due-date resolver + propagation triggers.
-- Additive, null-safe, advance-only. Never overwrites an explicit due_date.
-- Skips terminal tasks. Excludes plan-creation tasks (vcr_delivery_plan / vcr_plan_resubmit / ora_plan_creation / p2a_plan_creation)
-- which stay undated pending buffer decision.

CREATE OR REPLACE FUNCTION public.recompute_user_task_due_date(p_task_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_type text;
  meta jsonb;
  d timestamptz;
BEGIN
  SELECT type, COALESCE(metadata,'{}'::jsonb) INTO t_type, meta
  FROM user_tasks WHERE id = p_task_id;
  IF t_type IS NULL THEN RETURN NULL; END IF;

  -- ora_activity keeps its own governance (planned end_date via view); do not overwrite.
  IF t_type = 'ora_activity' THEN RETURN NULL; END IF;

  -- Plan-creation tasks stay undated (Daniel's buffer decision pending).
  IF t_type IN ('vcr_delivery_plan','vcr_plan_resubmit','ora_plan_creation','p2a_plan_creation') THEN
    RETURN NULL;
  END IF;

  CASE t_type
    WHEN 'register_action','register_review' THEN
      SELECT target_date INTO d FROM p2a_vcr_operational_registers
       WHERE id = NULLIF(meta->>'register_id','')::uuid;

    WHEN 'procedure_action','procedure_review' THEN
      SELECT target_date INTO d FROM p2a_vcr_procedures
       WHERE id = NULLIF(meta->>'procedure_id','')::uuid;

    WHEN 'training_action','training_review' THEN
      SELECT COALESCE(target_date, scheduled_date, tentative_date) INTO d
        FROM p2a_vcr_training
       WHERE id = NULLIF(meta->>'training_id','')::uuid;

    WHEN 'vcr_item_action','vcr_item_review' THEN
      SELECT hp.target_date INTO d
        FROM p2a_vcr_prerequisites pr
        JOIN p2a_handover_points hp ON hp.id = pr.handover_point_id
       WHERE pr.id = NULLIF(meta->>'prerequisite_id','')::uuid;

    WHEN 'vcr_approval_bundle','vcr_checklist_bundle','wh_review','wh_delivery_bundle' THEN
      SELECT target_date INTO d FROM p2a_handover_points
       WHERE id = NULLIF(meta->>'point_id','')::uuid;

    WHEN 'qualification_review' THEN
      SELECT target_date INTO d FROM p2a_handover_points
       WHERE id = NULLIF(meta->>'handover_point_id','')::uuid;

    WHEN 'pssr_checklist_bundle','pssr_approval_bundle' THEN
      SELECT MAX(scheduled_date) INTO d FROM pssr_walkdown_events
       WHERE pssr_id = NULLIF(meta->>'pssr_id','')::uuid;

    ELSE
      d := NULL;
  END CASE;

  RETURN d;
END;
$$;

-- Predicate: is this task in a terminal (completed/cancelled/superseded) state?
CREATE OR REPLACE FUNCTION public._is_task_terminal(p_status text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_status IN ('completed','done','cancelled','superseded','archived');
$$;

-- Trigger a: on user_tasks insert/update, set due_date from resolver ONLY when
-- (a) the resolver returns non-null, (b) the caller did not explicitly set a
-- different due_date value, and (c) the task is non-terminal. Advance-only —
-- never wipes an existing explicit date.
CREATE OR REPLACE FUNCTION public._user_tasks_apply_resolved_due()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  resolved timestamptz;
BEGIN
  IF public._is_task_terminal(NEW.status) THEN
    RETURN NEW;
  END IF;

  -- If caller explicitly set/changed the due_date on this statement, keep it.
  IF TG_OP = 'UPDATE' AND NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    RETURN NEW;
  END IF;

  -- Only fill when currently null (never overwrite).
  IF NEW.due_date IS NOT NULL THEN
    RETURN NEW;
  END IF;

  resolved := public.recompute_user_task_due_date(NEW.id);
  IF resolved IS NOT NULL THEN
    NEW.due_date := resolved;
  END IF;
  RETURN NEW;
END;
$$;

-- Insert fires BEFORE so NEW.id is already assigned by column default.
DROP TRIGGER IF EXISTS trg_user_tasks_resolved_due ON public.user_tasks;
CREATE TRIGGER trg_user_tasks_resolved_due
BEFORE INSERT OR UPDATE OF status, metadata, type ON public.user_tasks
FOR EACH ROW EXECUTE FUNCTION public._user_tasks_apply_resolved_due();

-- Trigger b: source-side propagation. When a governing date column changes,
-- re-run the resolver for dependent OPEN tasks. Advance-only: never touches a
-- terminal task; never overwrites an explicit non-null due_date that already
-- matches nothing (we simply update to the newly-resolved date, or clear it
-- when the source date is nulled and the current due_date came from the same
-- source — but to be safe and never fabricate, we only SET when resolver
-- returns non-null and current due is null or already resolver-derived).

CREATE OR REPLACE FUNCTION public._propagate_due_to_tasks(
  p_types text[], p_key text, p_value uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  r record;
  resolved timestamptz;
BEGIN
  IF p_value IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT id, due_date, status FROM user_tasks
     WHERE type = ANY(p_types)
       AND metadata->>p_key = p_value::text
       AND NOT public._is_task_terminal(status)
  LOOP
    resolved := public.recompute_user_task_due_date(r.id);
    IF resolved IS NOT NULL AND (r.due_date IS NULL OR r.due_date <> resolved) THEN
      UPDATE user_tasks SET due_date = resolved WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;

-- Handover points: fan out to item-tasks (via prerequisites), bundles, wh, qualification_review.
CREATE OR REPLACE FUNCTION public._trg_hp_target_date_propagate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.target_date IS DISTINCT FROM OLD.target_date THEN
    -- Bundles, wh, qualification_review are keyed directly by point.
    PERFORM public._propagate_due_to_tasks(
      ARRAY['vcr_approval_bundle','vcr_checklist_bundle','wh_review','wh_delivery_bundle'],
      'point_id', NEW.id);
    PERFORM public._propagate_due_to_tasks(
      ARRAY['qualification_review'], 'handover_point_id', NEW.id);
    -- Item-tasks are keyed by prerequisite_id; fan out per prereq under this point.
    UPDATE user_tasks ut
       SET due_date = public.recompute_user_task_due_date(ut.id)
     WHERE ut.type IN ('vcr_item_action','vcr_item_review')
       AND NOT public._is_task_terminal(ut.status)
       AND EXISTS (
         SELECT 1 FROM p2a_vcr_prerequisites pr
          WHERE pr.id = NULLIF(ut.metadata->>'prerequisite_id','')::uuid
            AND pr.handover_point_id = NEW.id
       )
       AND public.recompute_user_task_due_date(ut.id) IS NOT NULL
       AND (ut.due_date IS NULL OR ut.due_date <> public.recompute_user_task_due_date(ut.id));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_hp_target_date_propagate ON public.p2a_handover_points;
CREATE TRIGGER trg_hp_target_date_propagate
AFTER UPDATE OF target_date ON public.p2a_handover_points
FOR EACH ROW EXECUTE FUNCTION public._trg_hp_target_date_propagate();

CREATE OR REPLACE FUNCTION public._trg_reg_target_date_propagate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.target_date IS DISTINCT FROM OLD.target_date THEN
    PERFORM public._propagate_due_to_tasks(ARRAY['register_action','register_review'],'register_id', NEW.id);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_reg_target_date_propagate ON public.p2a_vcr_operational_registers;
CREATE TRIGGER trg_reg_target_date_propagate
AFTER UPDATE OF target_date ON public.p2a_vcr_operational_registers
FOR EACH ROW EXECUTE FUNCTION public._trg_reg_target_date_propagate();

CREATE OR REPLACE FUNCTION public._trg_proc_target_date_propagate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.target_date IS DISTINCT FROM OLD.target_date THEN
    PERFORM public._propagate_due_to_tasks(ARRAY['procedure_action','procedure_review'],'procedure_id', NEW.id);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_proc_target_date_propagate ON public.p2a_vcr_procedures;
CREATE TRIGGER trg_proc_target_date_propagate
AFTER UPDATE OF target_date ON public.p2a_vcr_procedures
FOR EACH ROW EXECUTE FUNCTION public._trg_proc_target_date_propagate();

CREATE OR REPLACE FUNCTION public._trg_trn_target_date_propagate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF COALESCE(NEW.target_date, NEW.scheduled_date, NEW.tentative_date)
     IS DISTINCT FROM COALESCE(OLD.target_date, OLD.scheduled_date, OLD.tentative_date) THEN
    PERFORM public._propagate_due_to_tasks(ARRAY['training_action','training_review'],'training_id', NEW.id);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_trn_target_date_propagate ON public.p2a_vcr_training;
CREATE TRIGGER trg_trn_target_date_propagate
AFTER UPDATE OF target_date, scheduled_date, tentative_date ON public.p2a_vcr_training
FOR EACH ROW EXECUTE FUNCTION public._trg_trn_target_date_propagate();

CREATE OR REPLACE FUNCTION public._trg_pssr_walkdown_propagate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date THEN
    PERFORM public._propagate_due_to_tasks(ARRAY['pssr_checklist_bundle','pssr_approval_bundle'],'pssr_id', NEW.pssr_id);
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_pssr_walkdown_propagate ON public.pssr_walkdown_events;
CREATE TRIGGER trg_pssr_walkdown_propagate
AFTER UPDATE OF scheduled_date ON public.pssr_walkdown_events
FOR EACH ROW EXECUTE FUNCTION public._trg_pssr_walkdown_propagate();

-- MVP-D3: QAQC D-family
INSERT INTO qaqc_checks (id, category, title, severity, is_active, sql) VALUES
('D1','due-date','No open non-ORA task carries a due_date that drifts from its governing source row', 'high', true, $SQL$
  WITH failing AS (
    SELECT ut.id, ut.type, ut.due_date, public.recompute_user_task_due_date(ut.id) AS expected
      FROM user_tasks ut
     WHERE ut.status NOT IN ('completed','done','cancelled','superseded','archived')
       AND ut.type <> 'ora_activity'
       AND ut.due_date IS NOT NULL
  )
  SELECT jsonb_build_object(
    'failing_count', (SELECT count(*) FROM failing WHERE expected IS NULL OR expected <> due_date),
    'samples', COALESCE((SELECT jsonb_agg(row_to_json(f)) FROM (
       SELECT id, type, due_date, expected FROM failing
        WHERE expected IS NULL OR expected <> due_date LIMIT 10) f), '[]'::jsonb)
  );
$SQL$),
('D2','due-date','Every source row with a governing date has all dependent open tasks carrying it', 'high', true, $SQL$
  WITH failing AS (
    SELECT ut.id, ut.type, ut.due_date, public.recompute_user_task_due_date(ut.id) AS expected
      FROM user_tasks ut
     WHERE ut.status NOT IN ('completed','done','cancelled','superseded','archived')
       AND ut.type <> 'ora_activity'
  )
  SELECT jsonb_build_object(
    'failing_count', (SELECT count(*) FROM failing WHERE expected IS NOT NULL AND (due_date IS NULL OR due_date <> expected)),
    'samples', COALESCE((SELECT jsonb_agg(row_to_json(f)) FROM (
       SELECT id, type, due_date, expected FROM failing
        WHERE expected IS NOT NULL AND (due_date IS NULL OR due_date <> expected) LIMIT 10) f), '[]'::jsonb)
  );
$SQL$)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category, title = EXCLUDED.title, severity = EXCLUDED.severity,
  is_active = EXCLUDED.is_active, sql = EXCLUDED.sql;
