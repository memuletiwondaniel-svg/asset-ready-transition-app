-- ──────────────────────────────────────────────────────────────────────────
-- M11 chunk 3: post-R18 fan-out triggers (R19/R20/R21/R22a/R22b + ITP handshake)
--
-- Fires on the SAME gate as R18: AFTER UPDATE on p2a_handover_approvers,
-- when NEW.stage='VCR', NEW.status='APPROVED', OLD.status<>'APPROVED', AND
-- vcr_plan_is_approved(NEW.point_id)=true.
--
-- All tasks: source='p2a_handover', contract='spec_v2', dedupe_key includes
-- point_id + delivering_party_id / sub-index, assignees resolved via
-- resolve_project_role_user. Idempotent (ON CONFLICT DO NOTHING via dedupe).
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_vcr_role_fanout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj_id   uuid;
  v_proj_code text;
  v_vcr       text;
  v_handover  uuid;
  v_sr        uuid;
  v_constr    uuid;
  v_comm      uuid;
  v_cmms      uuid;
  v_dp        RECORD;
  v_itp       RECORD;
  v_parent_id uuid;
  v_dedupe    text;
  v_sub_d     text;
  i           int;
  v_cmms_specs text[][] := ARRAY[
    ARRAY['deliver_cmms',   'Deliver CMMS for'],
    ARRAY['deliver_spares', 'Deliver 2Y Operating Spares for']
  ];
  v_c RECORD;
BEGIN
  -- Same gate as R18's create_vcr_deliverable_fanout.
  IF NEW.stage <> 'VCR' OR NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN
    RETURN NEW;
  END IF;
  IF NOT public.vcr_plan_is_approved(NEW.point_id) THEN RETURN NEW; END IF;

  SELECT pl.project_id,
         COALESCE(pr.project_id_prefix,'')||'-'||COALESCE(pr.project_id_number::text,''),
         pt.vcr_code,
         pl.id
    INTO v_proj_id, v_proj_code, v_vcr, v_handover
  FROM public.p2a_handover_points pt
  JOIN public.p2a_handover_plans pl ON pl.id = pt.handover_plan_id
  JOIN public.projects pr            ON pr.id = pl.project_id
  WHERE pt.id = NEW.point_id;
  IF v_proj_id IS NULL THEN RETURN NEW; END IF;

  v_sr     := public.resolve_project_role_user(v_proj_id, 'Sr ORA Engr');
  v_constr := public.resolve_project_role_user(v_proj_id, 'Construction Lead');
  v_comm   := public.resolve_project_role_user(v_proj_id, 'Commissioning Lead');
  v_cmms   := public.resolve_project_role_user(v_proj_id, 'CMMS Lead');

  -- ── R19 / R21 / R22a: checklist tasks scoped to vcr_item_delivering_parties ──
  -- One task per delivering-party row whose user_id matches the role user.
  FOR v_dp IN
    SELECT id, user_id
    FROM public.vcr_item_delivering_parties
    WHERE handover_point_id = NEW.point_id
      AND user_id IN (v_sr, v_constr, v_comm)
  LOOP
    v_dedupe := 'complete_checklist:'||NEW.point_id::text||':'||v_dp.id::text||':1';
    IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN CONTINUE; END IF;
    INSERT INTO public.user_tasks (
      user_id, title, description, type, status, priority, dedupe_key, metadata, progress_percentage
    ) VALUES (
      v_dp.user_id,
      v_proj_code||': Complete '||v_vcr||' Checklist Items',
      'Complete VCR delivering-party checklist items',
      'task','pending','High', v_dedupe,
      jsonb_build_object(
        'source','p2a_handover','contract','spec_v2',
        'project_id', v_proj_id, 'project_code', v_proj_code,
        'plan_id', v_handover, 'point_id', NEW.point_id, 'vcr_code', v_vcr,
        'action','complete_checklist',
        'delivering_party_id', v_dp.id
      ),
      0
    );
  END LOOP;

  -- ── R20: 2 CMMS deliverable parents → CMMS Lead, each with 2 sub-tasks ──
  IF v_cmms IS NOT NULL THEN
    FOR v_c IN
      SELECT v_cmms_specs[gs][1] AS action, v_cmms_specs[gs][2] AS title_prefix
      FROM generate_series(1, array_length(v_cmms_specs,1)) gs
    LOOP
      v_dedupe := v_c.action||':'||NEW.point_id::text||':CMMS Lead:1';
      IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN CONTINUE; END IF;
      INSERT INTO public.user_tasks (
        user_id, title, description, type, status, priority, dedupe_key, metadata, progress_percentage
      ) VALUES (
        v_cmms,
        v_proj_code||': '||v_c.title_prefix||' '||v_vcr,
        v_c.title_prefix||' '||v_vcr,
        'task','pending','High', v_dedupe,
        jsonb_build_object(
          'source','p2a_handover','contract','spec_v2',
          'project_id', v_proj_id, 'project_code', v_proj_code,
          'plan_id', v_handover, 'point_id', NEW.point_id, 'vcr_code', v_vcr,
          'action', v_c.action, 'has_sub_tasks', true
        ),
        0
      ) RETURNING id INTO v_parent_id;

      FOR i IN 1..2 LOOP
        v_sub_d := v_c.action||'_sub:'||NEW.point_id::text||':'||i::text||':1';
        INSERT INTO public.user_tasks (
          user_id, title, description, type, status, priority, dedupe_key, metadata, parent_task_id
        ) VALUES (
          v_cmms,
          v_proj_code||': '||v_c.title_prefix||' '||v_vcr||' — Step '||i::text,
          'Sub-step '||i::text||' for '||v_c.title_prefix||' '||v_vcr,
          'task','pending','Medium', v_sub_d,
          jsonb_build_object(
            'source','p2a_handover','contract','spec_v2',
            'project_id', v_proj_id, 'project_code', v_proj_code,
            'plan_id', v_handover, 'point_id', NEW.point_id, 'vcr_code', v_vcr,
            'action', v_c.action||'_step', 'step_index', i
          ),
          v_parent_id
        );
      END LOOP;
    END LOOP;
  END IF;

  -- ── R22b: Commissioning Lead "Complete ITP for VCR-XX" parent + one sub-task per p2a_itp_activities row ──
  IF v_comm IS NOT NULL THEN
    v_dedupe := 'complete_itp:'||NEW.point_id::text||':Commissioning Lead:1';
    IF NOT EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN
      INSERT INTO public.user_tasks (
        user_id, title, description, type, status, priority, dedupe_key, metadata, progress_percentage
      ) VALUES (
        v_comm,
        v_proj_code||': Complete ITP for '||v_vcr,
        'Complete ITP activities for '||v_vcr,
        'task','pending','High', v_dedupe,
        jsonb_build_object(
          'source','p2a_handover','contract','spec_v2',
          'project_id', v_proj_id, 'project_code', v_proj_code,
          'plan_id', v_handover, 'point_id', NEW.point_id, 'vcr_code', v_vcr,
          'action','complete_itp','has_sub_tasks', true
        ),
        0
      ) RETURNING id INTO v_parent_id;

      -- Sub-tasks: one per p2a_itp_activities row. Each requires Sr ORA Engr
      -- confirmation to count toward the parent (handled by is_child_task_complete).
      FOR v_itp IN
        SELECT id, activity_name FROM public.p2a_itp_activities
        WHERE handover_point_id = NEW.point_id
        ORDER BY display_order, created_at
      LOOP
        v_sub_d := 'complete_itp_activity:'||NEW.point_id::text||':'||v_itp.id::text||':1';
        INSERT INTO public.user_tasks (
          user_id, title, description, type, status, priority, dedupe_key, metadata, parent_task_id
        ) VALUES (
          v_comm,
          v_proj_code||': ITP — '||v_itp.activity_name,
          'Complete ITP activity '||v_itp.activity_name,
          'task','pending','Medium', v_sub_d,
          jsonb_build_object(
            'source','p2a_handover','contract','spec_v2',
            'project_id', v_proj_id, 'project_code', v_proj_code,
            'plan_id', v_handover, 'point_id', NEW.point_id, 'vcr_code', v_vcr,
            'action','complete_itp_activity',
            'itp_activity_id', v_itp.id,
            'requires_sr_ora_confirmation','true'
          ),
          v_parent_id
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_create_vcr_role_fanout ON public.p2a_handover_approvers;
CREATE TRIGGER trg_create_vcr_role_fanout
AFTER UPDATE ON public.p2a_handover_approvers
FOR EACH ROW
EXECUTE FUNCTION public.create_vcr_role_fanout();

-- ──────────────────────────────────────────────────────────────────────────
-- R22b handshake: when Commissioning Lead marks an ITP sub-task completed,
-- automatically create an Sr ORA Engr confirmation task. The sub-task only
-- counts toward the parent's progress when confirmed_by_sr_ora_engr=true
-- (handled by the existing is_child_task_complete fn).
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_itp_confirmation_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj_id uuid;
  v_proj_code text;
  v_sr uuid;
  v_dedupe text;
BEGIN
  -- Only react to ITP activity sub-tasks transitioning to 'completed'.
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.metadata->>'action','') <> 'complete_itp_activity' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.confirmed_by_sr_ora_engr, false) = true THEN RETURN NEW; END IF;

  v_proj_id   := (NEW.metadata->>'project_id')::uuid;
  v_proj_code := COALESCE(NEW.metadata->>'project_code','');
  v_sr        := public.resolve_project_role_user(v_proj_id, 'Sr ORA Engr');
  IF v_sr IS NULL THEN RETURN NEW; END IF;

  v_dedupe := 'confirm_itp_activity:'||NEW.id::text||':1';
  IF EXISTS (SELECT 1 FROM public.user_tasks WHERE dedupe_key = v_dedupe) THEN RETURN NEW; END IF;

  INSERT INTO public.user_tasks (
    user_id, title, description, type, status, priority, dedupe_key, metadata, progress_percentage
  ) VALUES (
    v_sr,
    v_proj_code||': Confirm ITP — '||COALESCE(NEW.title,''),
    'Sr ORA Engr confirmation required for Commissioning Lead ITP submission',
    'task','pending','High', v_dedupe,
    jsonb_build_object(
      'source','p2a_handover','contract','spec_v2',
      'project_id', v_proj_id, 'project_code', v_proj_code,
      'plan_id', NEW.metadata->>'plan_id',
      'point_id', NEW.metadata->>'point_id',
      'vcr_code', NEW.metadata->>'vcr_code',
      'action','confirm_itp_activity',
      'subject_task_id', NEW.id
    ),
    0
  );
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_create_itp_confirmation_task ON public.user_tasks;
CREATE TRIGGER trg_create_itp_confirmation_task
AFTER UPDATE OF status ON public.user_tasks
FOR EACH ROW
EXECUTE FUNCTION public.create_itp_confirmation_task();
