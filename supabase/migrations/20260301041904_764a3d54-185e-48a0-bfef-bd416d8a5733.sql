-- Fix: Add ON DELETE CASCADE to orp_activity_log foreign key to orp_plans
ALTER TABLE public.orp_activity_log
  DROP CONSTRAINT orp_activity_log_orp_plan_id_fkey,
  ADD CONSTRAINT orp_activity_log_orp_plan_id_fkey
    FOREIGN KEY (orp_plan_id) REFERENCES public.orp_plans(id) ON DELETE CASCADE;