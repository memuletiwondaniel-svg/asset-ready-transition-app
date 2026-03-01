
-- Fix remaining dependency cascade
ALTER TABLE public.orp_deliverable_dependencies
  DROP CONSTRAINT orp_deliverable_dependencies_predecessor_id_fkey,
  ADD CONSTRAINT orp_deliverable_dependencies_predecessor_id_fkey
    FOREIGN KEY (predecessor_id) REFERENCES public.orp_plan_deliverables(id) ON DELETE CASCADE;
