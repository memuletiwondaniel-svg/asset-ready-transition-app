
-- 1. Add is_retired to roles
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS is_retired boolean NOT NULL DEFAULT false;

-- 2. Repoint the single drift row BEFORE adding the validator
UPDATE public.p2a_handover_approvers
   SET role_name = 'Dep. Plant Director'
 WHERE role_name = 'Deputy Plant Director';

-- 3. Add cycle column (DEFAULT back-fills existing rows to 1)
ALTER TABLE public.orp_approvals
  ADD COLUMN IF NOT EXISTS cycle integer NOT NULL DEFAULT 1;

ALTER TABLE public.p2a_handover_approvers
  ADD COLUMN IF NOT EXISTS cycle integer NOT NULL DEFAULT 1;

-- 4. Add gate_model + reason to orp_plans
ALTER TABLE public.orp_plans
  ADD COLUMN IF NOT EXISTS gate_model text NOT NULL DEFAULT 'strict',
  ADD COLUMN IF NOT EXISTS gate_model_reason text;

-- Drop existing CHECK if a re-run; then add fresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orp_plans_gate_model_chk'
  ) THEN
    ALTER TABLE public.orp_plans
      ADD CONSTRAINT orp_plans_gate_model_chk
      CHECK (gate_model IN ('strict','legacy'));
  END IF;
END$$;

-- 5. Flip the one pre-spec ORP plan to legacy
UPDATE public.orp_plans
   SET gate_model = 'legacy',
       gate_model_reason = 'Pre-spec grandfather: plan APPROVED before strict approver spec landed (5c)'
 WHERE id = '2b88ecdf-3ba1-4198-9501-c27fe2edd7aa';

-- 6. Catalog-membership validator (FK-equivalent CHECK)
CREATE OR REPLACE FUNCTION public.validate_approver_role_label()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
  v_ok boolean;
BEGIN
  -- Pick the right column for each table
  IF TG_TABLE_NAME = 'orp_approvals' THEN
    v_label := NEW.approver_role;
  ELSIF TG_TABLE_NAME = 'p2a_handover_approvers' THEN
    v_label := NEW.role_name;
  ELSE
    RAISE EXCEPTION 'validate_approver_role_label: unexpected table %', TG_TABLE_NAME;
  END IF;

  IF v_label IS NULL OR length(btrim(v_label)) = 0 THEN
    RAISE EXCEPTION 'role label cannot be empty on %', TG_TABLE_NAME;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.name = v_label
      AND r.is_active = true
      AND r.is_retired = false
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION
      'role label "%" is not an active, non-retired role in roles.name (table %)',
      v_label, TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_approver_role_label() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_validate_orp_approval_role ON public.orp_approvals;
CREATE TRIGGER trg_validate_orp_approval_role
  BEFORE INSERT OR UPDATE OF approver_role ON public.orp_approvals
  FOR EACH ROW EXECUTE FUNCTION public.validate_approver_role_label();

DROP TRIGGER IF EXISTS trg_validate_p2a_approver_role ON public.p2a_handover_approvers;
CREATE TRIGGER trg_validate_p2a_approver_role
  BEFORE INSERT OR UPDATE OF role_name ON public.p2a_handover_approvers
  FOR EACH ROW EXECUTE FUNCTION public.validate_approver_role_label();
