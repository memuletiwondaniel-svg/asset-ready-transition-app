-- ═══════════════════════════════════════════════════════════════
-- Unified Approval UX: ORA Plan approval history + rejection sync + backfill
-- ═══════════════════════════════════════════════════════════════

-- 1. Create orp_approval_history table (mirrors p2a_approver_history)
CREATE TABLE IF NOT EXISTS public.orp_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orp_plan_id UUID REFERENCES public.orp_plans(id) ON DELETE CASCADE NOT NULL,
  original_approval_id UUID,
  user_id UUID NOT NULL,
  role_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  comments TEXT,
  approved_at TIMESTAMPTZ,
  cycle INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id)
);

ALTER TABLE public.orp_approval_history ENABLE ROW LEVEL SECURITY;

-- RLS: same access as orp_approvals
CREATE POLICY "Users can view ORP approval history"
  ON public.orp_approval_history FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.orp_plans
    WHERE orp_plans.id = orp_approval_history.orp_plan_id
    AND (orp_plans.created_by = auth.uid() OR orp_plans.ora_engineer_id = auth.uid())
  ));

CREATE POLICY "System can insert ORP approval history"
  ON public.orp_approval_history FOR INSERT
  WITH CHECK (true);

-- Tenant auto-stamp trigger
CREATE TRIGGER set_orp_approval_history_tenant
  BEFORE INSERT ON public.orp_approval_history
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_user();

-- 2. Add rejection metadata columns to orp_plans (mirrors p2a_handover_plans)
ALTER TABLE public.orp_plans
  ADD COLUMN IF NOT EXISTS last_rejection_comment TEXT,
  ADD COLUMN IF NOT EXISTS last_rejected_by_name TEXT,
  ADD COLUMN IF NOT EXISTS last_rejected_by_role TEXT,
  ADD COLUMN IF NOT EXISTS last_rejected_at TIMESTAMPTZ;

-- 3. Trigger: sync ORA rejection to orp_plans (mirrors trg_sync_p2a_rejection_to_plan)
CREATE OR REPLACE FUNCTION public.sync_ora_rejection_to_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rejector_name TEXT;
BEGIN
  IF NEW.status = 'REJECTED' THEN
    SELECT full_name INTO v_rejector_name
    FROM public.profiles
    WHERE user_id = NEW.approver_user_id
    LIMIT 1;

    UPDATE public.orp_plans SET
      last_rejection_comment = NEW.comments,
      last_rejected_by_name = COALESCE(v_rejector_name, NEW.approver_role),
      last_rejected_by_role = NEW.approver_role,
      last_rejected_at = COALESCE(NEW.approved_at, now()),
      status = 'DRAFT'
    WHERE id = NEW.orp_plan_id;

    UPDATE public.user_tasks SET
      metadata = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{last_rejection_role}', to_jsonb(NEW.approver_role)
            ),
            '{last_rejection_comment}', to_jsonb(COALESCE(NEW.comments, ''))
          ),
          '{last_rejection_at}', to_jsonb(COALESCE(NEW.approved_at::text, now()::text))
        ),
        '{plan_status}', '"DRAFT"'::jsonb
      )
    WHERE type IN ('task', 'ora_plan_creation')
      AND metadata->>'source' = 'ora_workflow'
      AND metadata->>'project_id' = (
        SELECT project_id::text FROM public.orp_plans WHERE id = NEW.orp_plan_id
      );

    INSERT INTO public.orp_approval_history (
      orp_plan_id, original_approval_id, user_id, role_name, status, comments, approved_at, cycle
    )
    SELECT
      NEW.orp_plan_id,
      NEW.id,
      NEW.approver_user_id,
      NEW.approver_role,
      'REJECTED',
      NEW.comments,
      COALESCE(NEW.approved_at, now()),
      COALESCE(
        (SELECT MAX(cycle) FROM public.orp_approval_history WHERE orp_plan_id = NEW.orp_plan_id),
        0
      ) + 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ora_rejection_to_plan ON public.orp_approvals;
CREATE TRIGGER trg_sync_ora_rejection_to_plan
  AFTER UPDATE ON public.orp_approvals
  FOR EACH ROW
  WHEN (NEW.status = 'REJECTED' AND OLD.status IS DISTINCT FROM 'REJECTED')
  EXECUTE FUNCTION public.sync_ora_rejection_to_plan();

-- 4. Trigger: archive ORA approval decisions to history on approve
CREATE OR REPLACE FUNCTION public.archive_ora_approval_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND OLD.status IS DISTINCT FROM 'APPROVED' THEN
    INSERT INTO public.orp_approval_history (
      orp_plan_id, original_approval_id, user_id, role_name, status, comments, approved_at, cycle
    )
    VALUES (
      NEW.orp_plan_id,
      NEW.id,
      NEW.approver_user_id,
      NEW.approver_role,
      'APPROVED',
      NEW.comments,
      COALESCE(NEW.approved_at, now()),
      COALESCE(
        (SELECT MAX(cycle) FROM public.orp_approval_history WHERE orp_plan_id = NEW.orp_plan_id),
        1
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_ora_approval ON public.orp_approvals;
CREATE TRIGGER trg_archive_ora_approval
  AFTER UPDATE ON public.orp_approvals
  FOR EACH ROW
  WHEN (NEW.status = 'APPROVED' AND OLD.status IS DISTINCT FROM 'APPROVED')
  EXECUTE FUNCTION public.archive_ora_approval_decision();

-- 5. Backfill existing ORA author tasks with plan_status and progress tiers
UPDATE public.user_tasks ut SET
  metadata = jsonb_set(
    jsonb_set(
      COALESCE(ut.metadata, '{}'::jsonb),
      '{plan_status}', '"DRAFT"'::jsonb
    ),
    '{completion_percentage}', '83'::jsonb
  )
FROM public.orp_plans op
WHERE ut.metadata->>'source' = 'ora_workflow'
  AND (ut.type = 'ora_plan_creation' OR ut.type = 'task')
  AND (ut.metadata->>'action' = 'create_ora_plan' OR ut.type = 'ora_plan_creation')
  AND ut.metadata->>'project_id' = op.project_id::text
  AND op.status = 'DRAFT'
  AND ut.status != 'completed';

UPDATE public.user_tasks ut SET
  metadata = jsonb_set(
    jsonb_set(
      COALESCE(ut.metadata, '{}'::jsonb),
      '{plan_status}', '"PENDING_APPROVAL"'::jsonb
    ),
    '{completion_percentage}', '95'::jsonb
  ),
  status = 'completed'
FROM public.orp_plans op
WHERE ut.metadata->>'source' = 'ora_workflow'
  AND (ut.type = 'ora_plan_creation' OR ut.type = 'task')
  AND (ut.metadata->>'action' = 'create_ora_plan' OR ut.type = 'ora_plan_creation')
  AND ut.metadata->>'project_id' = op.project_id::text
  AND op.status = 'PENDING_APPROVAL';

UPDATE public.user_tasks ut SET
  metadata = jsonb_set(
    jsonb_set(
      COALESCE(ut.metadata, '{}'::jsonb),
      '{plan_status}', '"APPROVED"'::jsonb
    ),
    '{completion_percentage}', '100'::jsonb
  ),
  status = 'completed'
FROM public.orp_plans op
WHERE ut.metadata->>'source' = 'ora_workflow'
  AND (ut.type = 'ora_plan_creation' OR ut.type = 'task')
  AND (ut.metadata->>'action' = 'create_ora_plan' OR ut.type = 'ora_plan_creation')
  AND ut.metadata->>'project_id' = op.project_id::text
  AND op.status = 'APPROVED';

-- 6. Backfill rejection metadata on orp_plans from existing rejected approvals
UPDATE public.orp_plans op SET
  last_rejection_comment = sub.comments,
  last_rejected_by_role = sub.approver_role,
  last_rejected_at = sub.approved_at
FROM (
  SELECT DISTINCT ON (orp_plan_id)
    orp_plan_id, comments, approver_role, approved_at
  FROM public.orp_approvals
  WHERE status = 'REJECTED'
  ORDER BY orp_plan_id, approved_at DESC
) sub
WHERE op.id = sub.orp_plan_id
  AND op.last_rejection_comment IS NULL;

ALTER TABLE public.orp_approval_history REPLICA IDENTITY FULL;