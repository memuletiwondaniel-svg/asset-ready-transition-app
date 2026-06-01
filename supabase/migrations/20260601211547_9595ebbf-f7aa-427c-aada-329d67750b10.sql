ALTER TABLE public.p2a_handover_plans
  ADD COLUMN IF NOT EXISTS gate_model text NOT NULL DEFAULT 'strict'
  CHECK (gate_model IN ('strict','legacy'));

ALTER TABLE public.p2a_handover_points
  ADD COLUMN IF NOT EXISTS gate_model text NOT NULL DEFAULT 'strict'
  CHECK (gate_model IN ('strict','legacy'));

UPDATE public.p2a_handover_plans
   SET gate_model = 'legacy'
 WHERE created_at < now() - interval '1 day'
   AND gate_model = 'strict';

UPDATE public.p2a_handover_points p
   SET gate_model = 'legacy'
  FROM public.p2a_handover_plans pl
 WHERE p.handover_plan_id = pl.id
   AND pl.gate_model = 'legacy'
   AND p.gate_model = 'strict';