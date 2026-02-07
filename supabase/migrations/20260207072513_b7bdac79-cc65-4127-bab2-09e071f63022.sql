-- Make ora_plan_id nullable since P2A plans can be created independently via the wizard
ALTER TABLE public.p2a_handover_plans ALTER COLUMN ora_plan_id DROP NOT NULL;

NOTIFY pgrst, 'reload schema';