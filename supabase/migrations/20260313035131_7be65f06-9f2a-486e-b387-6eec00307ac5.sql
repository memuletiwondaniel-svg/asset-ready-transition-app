-- Add last_rejected_at to p2a_handover_plans (last_rejection_comment, last_rejected_by_name, last_rejected_by_role already exist)
ALTER TABLE public.p2a_handover_plans
ADD COLUMN IF NOT EXISTS last_rejected_at timestamptz;

-- Create trigger to auto-sync rejection context from approvers to plan
CREATE OR REPLACE FUNCTION public.sync_p2a_rejection_to_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'REJECTED' THEN
    UPDATE public.p2a_handover_plans
    SET
      last_rejection_comment = COALESCE(NEW.comments, 'Rejected by approver'),
      last_rejected_by_role = NEW.role_name,
      last_rejected_at = COALESCE(NEW.approved_at, now()),
      updated_at = now()
    WHERE id = NEW.handover_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop if exists then create trigger
DROP TRIGGER IF EXISTS trg_sync_p2a_rejection_to_plan ON public.p2a_handover_approvers;
CREATE TRIGGER trg_sync_p2a_rejection_to_plan
  AFTER UPDATE ON public.p2a_handover_approvers
  FOR EACH ROW
  WHEN (NEW.status = 'REJECTED')
  EXECUTE FUNCTION public.sync_p2a_rejection_to_plan();

-- Backfill last_rejected_at from existing data where it's null but rejection fields exist
UPDATE public.p2a_handover_plans
SET last_rejected_at = updated_at
WHERE last_rejection_comment IS NOT NULL
  AND last_rejected_at IS NULL;