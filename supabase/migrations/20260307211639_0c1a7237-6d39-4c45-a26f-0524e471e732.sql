
-- Backfill: Generate tasks for DP300's already-approved ORA plan
-- by temporarily toggling status to re-fire the trigger
DO $$
DECLARE
  v_plan_id UUID := '2b88ecdf-3ba1-4198-9501-c27fe2edd7aa';
BEGIN
  -- Temporarily set to non-APPROVED to allow re-trigger
  UPDATE public.orp_plans SET status = 'DRAFT' WHERE id = v_plan_id;
  -- Set back to APPROVED — this fires trg_auto_create_ora_leaf_tasks
  UPDATE public.orp_plans SET status = 'APPROVED' WHERE id = v_plan_id;
END;
$$;
