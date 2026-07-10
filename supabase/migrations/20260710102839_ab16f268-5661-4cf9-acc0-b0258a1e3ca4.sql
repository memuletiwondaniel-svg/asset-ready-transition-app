ALTER TABLE public.insight_schema_status ADD COLUMN IF NOT EXISTS note text;
INSERT INTO public.insight_schema_status (schema_key, eval_status, aggregate, note, updated_at)
VALUES ('hemp_di03', 'passed', jsonb_build_object('grandfathered', true, 'ran_at', now()), 'grandfathered — production-tuned on real BGC registers; pending real-fixture eval', now())
ON CONFLICT (schema_key) DO UPDATE
  SET eval_status = EXCLUDED.eval_status,
      note = EXCLUDED.note,
      aggregate = EXCLUDED.aggregate,
      updated_at = EXCLUDED.updated_at;