
CREATE OR REPLACE FUNCTION public.trg_vcr_sof_approvers_cascade() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_all_signed boolean;
  v_all_hp_signed boolean;
BEGIN
  IF NEW.status <> 'SIGNED' OR OLD.status = 'SIGNED' THEN
    RETURN NEW;
  END IF;

  -- Cascade next level: unlock N+1 when all level-N rows are SIGNED
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

  -- Stamp the handover point when EVERY approver row (all levels) is SIGNED
  SELECT bool_and(status = 'SIGNED') INTO v_all_hp_signed
    FROM public.vcr_sof_approvers
   WHERE handover_point_id = NEW.handover_point_id;
  IF v_all_hp_signed THEN
    UPDATE public.p2a_handover_points
       SET sof_signed_at = COALESCE(sof_signed_at, now()),
           status = 'SIGNED'
     WHERE id = NEW.handover_point_id
       AND (status IS DISTINCT FROM 'SIGNED' OR sof_signed_at IS NULL);
  END IF;

  RETURN NEW;
END $$;
