
ALTER TABLE public.vcr_sof_approvers ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.vcr_pac_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  approver_role text NOT NULL,
  approver_level int NOT NULL,
  user_id uuid,
  approver_name text,
  status text NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED','PENDING','SIGNED')),
  signed_at timestamptz,
  signature_data text,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handover_point_id, approver_role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vcr_pac_approvers TO authenticated;
GRANT ALL ON public.vcr_pac_approvers TO service_role;

ALTER TABLE public.vcr_pac_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vcr_pac_approvers_select_project_members"
  ON public.vcr_pac_approvers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.p2a_handover_points hp
      JOIN public.p2a_handover_plans pl ON pl.id = hp.handover_plan_id
      JOIN public.project_team_members ptm ON ptm.project_id = pl.project_id
      WHERE hp.id = vcr_pac_approvers.handover_point_id AND ptm.user_id = auth.uid()
    )
  );

CREATE POLICY "vcr_pac_approvers_update_holder"
  ON public.vcr_pac_approvers FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'PENDING')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "vcr_pac_approvers_insert_none"
  ON public.vcr_pac_approvers FOR INSERT TO authenticated WITH CHECK (false);

CREATE TRIGGER trg_vcr_pac_approvers_updated_at
  BEFORE UPDATE ON public.vcr_pac_approvers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.vcr_cert_number(
  p_type text, p_project_prefix text, p_project_number text, p_vcr_code text
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT p_type || '-'
    || regexp_replace(COALESCE(p_project_prefix,'') || COALESCE(p_project_number,''), '[^A-Za-z0-9]', '', 'g')
    || '-VCR'
    || regexp_replace(COALESCE(p_vcr_code,''), '.*?(\d+)$', '\1');
$$;

CREATE OR REPLACE FUNCTION public.seed_vcr_sof_approvers(p_hp uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_plan uuid; v_project uuid;
  v_seats text[][] := ARRAY[
    ARRAY['Snr ORA Engr.',    '1'],
    ARRAY['ORA Lead',         '1'],
    ARRAY['Tech Safety TA2',  '2'],
    ARRAY['HSE Director',     '2'],
    ARRAY['Central Mtce Lead','3']
  ];
  v_seat text[]; v_role text; v_level int; v_user uuid; v_name text;
BEGIN
  IF p_hp IS NULL THEN RETURN; END IF;
  SELECT handover_plan_id INTO v_plan FROM public.p2a_handover_points WHERE id = p_hp;
  IF v_plan IS NULL THEN RETURN; END IF;
  SELECT project_id INTO v_project FROM public.p2a_handover_plans WHERE id = v_plan;

  FOREACH v_seat SLICE 1 IN ARRAY v_seats LOOP
    v_role := v_seat[1]; v_level := v_seat[2]::int;
    IF EXISTS (SELECT 1 FROM public.vcr_sof_approvers WHERE handover_point_id = p_hp AND approver_role = v_role) THEN CONTINUE; END IF;
    v_user := public.resolve_project_role_user(v_project, v_role);
    -- Skip seat if the resolved user already occupies another seat on this HP (legacy unique constraint on hp+user).
    IF v_user IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vcr_sof_approvers WHERE handover_point_id = p_hp AND user_id = v_user
    ) THEN v_user := NULL; END IF;
    v_name := NULL;
    IF v_user IS NOT NULL THEN SELECT full_name INTO v_name FROM public.profiles WHERE user_id = v_user LIMIT 1; END IF;
    INSERT INTO public.vcr_sof_approvers (handover_point_id, approver_role, approver_level, user_id, approver_name, status)
    VALUES (p_hp, v_role, v_level, v_user, COALESCE(v_name, v_role), 'LOCKED');
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.seed_vcr_pac_approvers(p_hp uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_plan uuid; v_project uuid;
  v_seats text[][] := ARRAY[
    ARRAY['Plant Director',   '1'],
    ARRAY['Project Hub Lead', '2']
  ];
  v_seat text[]; v_role text; v_level int; v_user uuid; v_name text;
BEGIN
  IF p_hp IS NULL THEN RETURN; END IF;
  SELECT handover_plan_id INTO v_plan FROM public.p2a_handover_points WHERE id = p_hp;
  IF v_plan IS NULL THEN RETURN; END IF;
  SELECT project_id INTO v_project FROM public.p2a_handover_plans WHERE id = v_plan;

  FOREACH v_seat SLICE 1 IN ARRAY v_seats LOOP
    v_role := v_seat[1]; v_level := v_seat[2]::int;
    v_user := public.resolve_project_role_user(v_project, v_role);
    v_name := NULL;
    IF v_user IS NOT NULL THEN SELECT full_name INTO v_name FROM public.profiles WHERE user_id = v_user LIMIT 1; END IF;
    INSERT INTO public.vcr_pac_approvers (handover_point_id, approver_role, approver_level, user_id, approver_name, status)
    VALUES (p_hp, v_role, v_level, v_user, COALESCE(v_name, v_role), 'LOCKED')
    ON CONFLICT (handover_point_id, approver_role) DO NOTHING;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.trg_vcr_pac_approvers_cascade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_all_signed boolean; v_all_hp_signed boolean;
BEGIN
  IF NEW.status <> 'SIGNED' OR OLD.status = 'SIGNED' THEN RETURN NEW; END IF;
  SELECT bool_and(status = 'SIGNED') INTO v_all_signed FROM public.vcr_pac_approvers
   WHERE handover_point_id = NEW.handover_point_id AND approver_level = NEW.approver_level;
  IF v_all_signed THEN
    UPDATE public.vcr_pac_approvers SET status = 'PENDING', updated_at = now()
     WHERE handover_point_id = NEW.handover_point_id
       AND approver_level = NEW.approver_level + 1 AND status = 'LOCKED';
  END IF;
  SELECT bool_and(status = 'SIGNED') INTO v_all_hp_signed FROM public.vcr_pac_approvers
   WHERE handover_point_id = NEW.handover_point_id;
  IF v_all_hp_signed THEN
    UPDATE public.p2a_handover_points
       SET pac_signed_at = COALESCE(pac_signed_at, now()),
           pac_signed_by = COALESCE(pac_signed_by, NEW.user_id)
     WHERE id = NEW.handover_point_id AND pac_signed_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_vcr_pac_approvers_cascade ON public.vcr_pac_approvers;
CREATE TRIGGER trg_vcr_pac_approvers_cascade
  AFTER UPDATE OF status ON public.vcr_pac_approvers
  FOR EACH ROW EXECUTE FUNCTION public.trg_vcr_pac_approvers_cascade();

CREATE OR REPLACE FUNCTION public.trg_vcr_discipline_assurance_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_hp uuid := NEW.handover_point_id;
  v_expected int; v_submitted int;
  v_vcr_code text; v_vcr_name text;
  v_plan_id uuid; v_project_id uuid; v_project_code text; v_tenant_id uuid;
  v_label text; v_user uuid; v_is_hc boolean;
BEGIN
  SELECT hp.vcr_code, hp.name, hp.handover_plan_id INTO v_vcr_code, v_vcr_name, v_plan_id
    FROM public.p2a_handover_points hp WHERE hp.id = v_hp;
  IF v_plan_id IS NULL THEN RETURN NEW; END IF;
  SELECT pl.project_id, pl.project_code INTO v_project_id, v_project_code
    FROM public.p2a_handover_plans pl WHERE pl.id = v_plan_id;
  SELECT p.tenant_id INTO v_tenant_id FROM public.projects p WHERE p.id = v_project_id;
  v_label := COALESCE(v_vcr_code, '') || ' (' || COALESCE(v_vcr_name, '') || ')';

  IF NEW.statement_type = 'discipline' THEN
    SELECT COUNT(DISTINCT delivering_party_id) INTO v_expected FROM public.p2a_vcr_prerequisites
      WHERE handover_point_id = v_hp AND delivering_party_id IS NOT NULL;
    SELECT COUNT(DISTINCT COALESCE(discipline_role_id::text, discipline_role_name)) INTO v_submitted
      FROM public.vcr_discipline_assurance WHERE handover_point_id = v_hp AND statement_type = 'discipline';
    IF v_expected > 0 AND v_submitted >= v_expected THEN
      IF NOT EXISTS (SELECT 1 FROM public.user_tasks
        WHERE type = 'vcr_interdisciplinary_summary' AND (metadata->>'handover_point_id')::uuid = v_hp
          AND status NOT IN ('completed','cancelled'))
      THEN
        FOR v_user IN SELECT u FROM public.resolve_project_role_users(v_project_id, 'Snr ORA Engr.') u LOOP
          INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, tenant_id, metadata) VALUES (
            v_user, 'Enter Interdisciplinary Summary for ' || v_label,
            'All discipline assurance statements are complete. Enter the interdisciplinary summary to complete this VCR.',
            'vcr_interdisciplinary_summary', 'High', 'pending', v_tenant_id,
            jsonb_build_object('handover_point_id', v_hp, 'vcr_code', v_vcr_code, 'vcr_name', v_vcr_name,
              'project_id', v_project_id, 'project_code', v_project_code, 'action', 'enter_interdisciplinary_summary'));
        END LOOP;
      END IF;
    END IF;
  ELSIF NEW.statement_type = 'interdisciplinary' THEN
    UPDATE public.user_tasks SET status = 'completed', updated_at = now()
     WHERE type = 'vcr_interdisciplinary_summary' AND (metadata->>'handover_point_id')::uuid = v_hp
       AND status NOT IN ('completed','cancelled');
    v_is_hc := public.vcr_hp_is_hydrocarbon(v_hp);
    IF v_is_hc THEN
      PERFORM public.seed_vcr_sof_approvers(v_hp);
      UPDATE public.vcr_sof_approvers SET status = 'PENDING', updated_at = now()
        WHERE handover_point_id = v_hp AND approver_level = 1 AND status = 'LOCKED';
      IF NOT EXISTS (SELECT 1 FROM public.user_tasks
        WHERE type = 'task' AND (metadata->>'action') = 'schedule_sof_meeting'
          AND (metadata->>'handover_point_id')::uuid = v_hp AND status NOT IN ('completed','cancelled'))
      THEN
        FOR v_user IN SELECT u FROM public.resolve_project_role_users(v_project_id, 'Snr ORA Engr.') u LOOP
          INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, tenant_id, metadata) VALUES (
            v_user, 'Schedule SoF Meeting for ' || v_label,
            'Schedule the Statement of Fitness meeting for this hydrocarbon VCR.',
            'task', 'High', 'pending', v_tenant_id,
            jsonb_build_object('handover_point_id', v_hp, 'vcr_code', v_vcr_code, 'vcr_name', v_vcr_name,
              'project_id', v_project_id, 'project_code', v_project_code, 'action', 'schedule_sof_meeting'));
          EXIT;
        END LOOP;
      END IF;
    ELSE
      PERFORM public.seed_vcr_pac_approvers(v_hp);
      UPDATE public.vcr_pac_approvers SET status = 'PENDING', updated_at = now()
        WHERE handover_point_id = v_hp AND approver_level = 1 AND status = 'LOCKED';
      IF NOT EXISTS (SELECT 1 FROM public.user_tasks
        WHERE type = 'task' AND (metadata->>'action') = 'schedule_pac_meeting'
          AND (metadata->>'handover_point_id')::uuid = v_hp AND status NOT IN ('completed','cancelled'))
      THEN
        FOR v_user IN SELECT u FROM public.resolve_project_role_users(v_project_id, 'Snr ORA Engr.') u LOOP
          INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, tenant_id, metadata) VALUES (
            v_user, 'Schedule PAC Meeting for ' || v_label,
            'Schedule the Provisional Acceptance Certificate meeting for this VCR.',
            'task', 'High', 'pending', v_tenant_id,
            jsonb_build_object('handover_point_id', v_hp, 'vcr_code', v_vcr_code, 'vcr_name', v_vcr_name,
              'project_id', v_project_id, 'project_code', v_project_code, 'action', 'schedule_pac_meeting'));
          EXIT;
        END LOOP;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.trg_vcr_sof_approvers_cascade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_all_signed boolean; v_all_hp_signed boolean;
  v_hp uuid := NEW.handover_point_id;
  v_plan_id uuid; v_project_id uuid; v_project_code text; v_tenant_id uuid;
  v_vcr_code text; v_vcr_name text; v_label text; v_user uuid;
BEGIN
  IF NEW.status <> 'SIGNED' OR OLD.status = 'SIGNED' THEN RETURN NEW; END IF;
  SELECT bool_and(status = 'SIGNED') INTO v_all_signed FROM public.vcr_sof_approvers
   WHERE handover_point_id = v_hp AND approver_level = NEW.approver_level;
  IF v_all_signed THEN
    UPDATE public.vcr_sof_approvers SET status = 'PENDING', updated_at = now()
     WHERE handover_point_id = v_hp AND approver_level = NEW.approver_level + 1 AND status = 'LOCKED';
  END IF;
  SELECT bool_and(status = 'SIGNED') INTO v_all_hp_signed FROM public.vcr_sof_approvers
   WHERE handover_point_id = v_hp;
  IF v_all_hp_signed THEN
    UPDATE public.p2a_handover_points
       SET sof_signed_at = COALESCE(sof_signed_at, now()), status = 'SIGNED'
     WHERE id = v_hp AND (status IS DISTINCT FROM 'SIGNED' OR sof_signed_at IS NULL);

    SELECT hp.vcr_code, hp.name, hp.handover_plan_id INTO v_vcr_code, v_vcr_name, v_plan_id
      FROM public.p2a_handover_points hp WHERE hp.id = v_hp;
    IF v_plan_id IS NOT NULL THEN
      SELECT pl.project_id, pl.project_code INTO v_project_id, v_project_code
        FROM public.p2a_handover_plans pl WHERE pl.id = v_plan_id;
      SELECT p.tenant_id INTO v_tenant_id FROM public.projects p WHERE p.id = v_project_id;
      v_label := COALESCE(v_vcr_code, '') || ' (' || COALESCE(v_vcr_name, '') || ')';
      PERFORM public.seed_vcr_pac_approvers(v_hp);
      UPDATE public.vcr_pac_approvers SET status = 'PENDING', updated_at = now()
        WHERE handover_point_id = v_hp AND approver_level = 1 AND status = 'LOCKED';
      IF NOT EXISTS (SELECT 1 FROM public.user_tasks
        WHERE type = 'task' AND (metadata->>'action') = 'schedule_pac_meeting'
          AND (metadata->>'handover_point_id')::uuid = v_hp AND status NOT IN ('completed','cancelled'))
      THEN
        FOR v_user IN SELECT u FROM public.resolve_project_role_users(v_project_id, 'Snr ORA Engr.') u LOOP
          INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, tenant_id, metadata) VALUES (
            v_user, 'Schedule PAC Meeting for ' || v_label,
            'Schedule the Provisional Acceptance Certificate meeting for this VCR.',
            'task', 'High', 'pending', v_tenant_id,
            jsonb_build_object('handover_point_id', v_hp, 'vcr_code', v_vcr_code, 'vcr_name', v_vcr_name,
              'project_id', v_project_id, 'project_code', v_project_code, 'action', 'schedule_pac_meeting'));
          EXIT;
        END LOOP;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT hp.id FROM public.p2a_handover_points hp
     WHERE public.vcr_hp_is_hydrocarbon(hp.id) = true LOOP
    PERFORM public.seed_vcr_sof_approvers(r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.p2a_handover_points LOOP
    PERFORM public.seed_vcr_pac_approvers(r.id);
  END LOOP;
END $$;
