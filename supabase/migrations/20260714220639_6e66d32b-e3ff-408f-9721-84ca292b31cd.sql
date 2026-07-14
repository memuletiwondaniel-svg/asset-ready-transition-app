
-- 1. Add new task type
ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_type_check;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_type_check CHECK (type = ANY (ARRAY[
  'approval','task','update','review',
  'vcr_checklist_bundle','vcr_approval_bundle',
  'pssr_checklist_bundle','pssr_approval_bundle',
  'ora_plan_review','ora_activity','vcr_delivery_plan','ora_plan_creation','vcr_plan_resubmit',
  'vcr_interdisciplinary_summary'
]));

-- 2. vcr_key_activities table
CREATE TABLE IF NOT EXISTS public.vcr_key_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_date timestamptz,
  scheduled_end_date timestamptz,
  location text,
  notes text,
  attendees jsonb NOT NULL DEFAULT '[]'::jsonb,
  outlook_event_id text,
  scheduled_by uuid,
  completed_at timestamptz,
  task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vcr_key_activities TO authenticated;
GRANT ALL ON public.vcr_key_activities TO service_role;

ALTER TABLE public.vcr_key_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vcr_key_activities read for project members"
  ON public.vcr_key_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.p2a_handover_points hp
      JOIN public.p2a_handover_plans pl ON pl.id = hp.handover_plan_id
      JOIN public.project_team_members ptm ON ptm.project_id = pl.project_id
      WHERE hp.id = vcr_key_activities.handover_point_id
        AND ptm.user_id = auth.uid()
    )
  );

CREATE POLICY "vcr_key_activities write for project members"
  ON public.vcr_key_activities FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.p2a_handover_points hp
      JOIN public.p2a_handover_plans pl ON pl.id = hp.handover_plan_id
      JOIN public.project_team_members ptm ON ptm.project_id = pl.project_id
      WHERE hp.id = vcr_key_activities.handover_point_id
        AND ptm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.p2a_handover_points hp
      JOIN public.p2a_handover_plans pl ON pl.id = hp.handover_plan_id
      JOIN public.project_team_members ptm ON ptm.project_id = pl.project_id
      WHERE hp.id = vcr_key_activities.handover_point_id
        AND ptm.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public._touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_vcr_key_activities_touch ON public.vcr_key_activities;
CREATE TRIGGER trg_vcr_key_activities_touch
  BEFORE UPDATE ON public.vcr_key_activities
  FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_vcr_key_activities_hp
  ON public.vcr_key_activities (handover_point_id, activity_type);

-- 3. Hydrocarbon helper
CREATE OR REPLACE FUNCTION public.vcr_hp_is_hydrocarbon(p_hp uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.p2a_handover_point_systems hps
    JOIN public.p2a_systems s ON s.id = hps.system_id
    WHERE hps.handover_point_id = p_hp AND s.is_hydrocarbon
  );
$$;

-- 4. Discipline-assurance completion trigger
CREATE OR REPLACE FUNCTION public.trg_vcr_discipline_assurance_completion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hp uuid := NEW.handover_point_id;
  v_expected int;
  v_submitted int;
  v_vcr_code text;
  v_vcr_name text;
  v_plan_id uuid;
  v_project_id uuid;
  v_project_code text;
  v_tenant_id uuid;
  v_label text;
  v_user uuid;
  v_is_hc boolean;
  v_assigned boolean;
BEGIN
  SELECT hp.vcr_code, hp.name, hp.handover_plan_id
    INTO v_vcr_code, v_vcr_name, v_plan_id
    FROM public.p2a_handover_points hp WHERE hp.id = v_hp;
  IF v_plan_id IS NULL THEN RETURN NEW; END IF;

  SELECT pl.project_id, pl.project_code INTO v_project_id, v_project_code
    FROM public.p2a_handover_plans pl WHERE pl.id = v_plan_id;
  SELECT p.tenant_id INTO v_tenant_id FROM public.projects p WHERE p.id = v_project_id;

  v_label := COALESCE(v_vcr_code, '') || ' (' || COALESCE(v_vcr_name, '') || ')';

  IF NEW.statement_type = 'discipline' THEN
    SELECT COUNT(DISTINCT delivering_party_id) INTO v_expected
      FROM public.p2a_vcr_prerequisites
      WHERE handover_point_id = v_hp AND delivering_party_id IS NOT NULL;

    SELECT COUNT(DISTINCT COALESCE(discipline_role_id::text, discipline_role_name)) INTO v_submitted
      FROM public.vcr_discipline_assurance
      WHERE handover_point_id = v_hp AND statement_type = 'discipline';

    IF v_expected > 0 AND v_submitted >= v_expected THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.user_tasks
        WHERE type = 'vcr_interdisciplinary_summary'
          AND (metadata->>'handover_point_id')::uuid = v_hp
          AND status NOT IN ('completed','cancelled')
      ) THEN
        v_assigned := false;
        FOR v_user IN
          SELECT u FROM public.resolve_project_role_users(v_project_id, 'Snr ORA Engr.') u
        LOOP
          INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, tenant_id, metadata)
          VALUES (
            v_user,
            'Enter Interdisciplinary Summary for ' || v_label,
            'All discipline assurance statements are complete. Enter the interdisciplinary summary to complete this VCR.',
            'vcr_interdisciplinary_summary', 'High', 'pending', v_tenant_id,
            jsonb_build_object(
              'handover_point_id', v_hp, 'vcr_code', v_vcr_code, 'vcr_name', v_vcr_name,
              'project_id', v_project_id, 'project_code', v_project_code,
              'action', 'enter_interdisciplinary_summary'
            )
          );
          v_assigned := true;
        END LOOP;
        IF NOT v_assigned THEN
          FOR v_user IN
            SELECT DISTINCT u FROM unnest(ARRAY['Snr ORA Engr','Snr. ORA Engr.','Snr. ORA Engr','Senior ORA Engr.','Senior ORA Engineer']) AS r,
                 LATERAL public.resolve_project_role_users(v_project_id, r) u
          LOOP
            INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, tenant_id, metadata)
            VALUES (
              v_user,
              'Enter Interdisciplinary Summary for ' || v_label,
              'All discipline assurance statements are complete. Enter the interdisciplinary summary to complete this VCR.',
              'vcr_interdisciplinary_summary', 'High', 'pending', v_tenant_id,
              jsonb_build_object(
                'handover_point_id', v_hp, 'vcr_code', v_vcr_code, 'vcr_name', v_vcr_name,
                'project_id', v_project_id, 'project_code', v_project_code,
                'action', 'enter_interdisciplinary_summary'
              )
            );
            EXIT;
          END LOOP;
        END IF;
      END IF;
    END IF;

  ELSIF NEW.statement_type = 'interdisciplinary' THEN
    UPDATE public.user_tasks
       SET status = 'completed', updated_at = now()
     WHERE type = 'vcr_interdisciplinary_summary'
       AND (metadata->>'handover_point_id')::uuid = v_hp
       AND status NOT IN ('completed','cancelled');

    v_is_hc := public.vcr_hp_is_hydrocarbon(v_hp);
    IF v_is_hc THEN
      UPDATE public.vcr_sof_approvers
         SET status = 'PENDING', updated_at = now()
       WHERE handover_point_id = v_hp
         AND approver_level = 1
         AND status = 'LOCKED';

      IF NOT EXISTS (
        SELECT 1 FROM public.user_tasks
        WHERE type = 'task'
          AND (metadata->>'action') = 'schedule_sof_meeting'
          AND (metadata->>'handover_point_id')::uuid = v_hp
          AND status NOT IN ('completed','cancelled')
      ) THEN
        FOR v_user IN
          SELECT u FROM public.resolve_project_role_users(v_project_id, 'Snr ORA Engr.') u
        LOOP
          INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, tenant_id, metadata)
          VALUES (
            v_user,
            'Schedule SoF Meeting for ' || v_label,
            'Schedule the Statement of Fitness meeting for this hydrocarbon VCR.',
            'task', 'High', 'pending', v_tenant_id,
            jsonb_build_object(
              'handover_point_id', v_hp, 'vcr_code', v_vcr_code, 'vcr_name', v_vcr_name,
              'project_id', v_project_id, 'project_code', v_project_code,
              'action', 'schedule_sof_meeting'
            )
          );
          EXIT;
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_vcr_discipline_assurance_completion ON public.vcr_discipline_assurance;
CREATE TRIGGER trg_vcr_discipline_assurance_completion
  AFTER INSERT OR UPDATE ON public.vcr_discipline_assurance
  FOR EACH ROW EXECUTE FUNCTION public.trg_vcr_discipline_assurance_completion();

-- 5. SoF approver cascade trigger
CREATE OR REPLACE FUNCTION public.trg_vcr_sof_approvers_cascade() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_all_signed boolean;
BEGIN
  IF NEW.status <> 'SIGNED' OR OLD.status = 'SIGNED' THEN
    RETURN NEW;
  END IF;
  SELECT bool_and(status = 'SIGNED') INTO v_all_signed
    FROM public.vcr_sof_approvers
   WHERE handover_point_id = NEW.handover_point_id
     AND approver_level = NEW.approver_level;
  IF v_all_signed THEN
    UPDATE public.vcr_sof_approvers
       SET status = 'PENDING', updated_at = now()
     WHERE handover_point_id = NEW.handover_point_id
       AND approver_level = NEW.approver_level + 1
       AND status = 'LOCKED';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_vcr_sof_approvers_cascade ON public.vcr_sof_approvers;
CREATE TRIGGER trg_vcr_sof_approvers_cascade
  AFTER UPDATE OF status ON public.vcr_sof_approvers
  FOR EACH ROW EXECUTE FUNCTION public.trg_vcr_sof_approvers_cascade();
