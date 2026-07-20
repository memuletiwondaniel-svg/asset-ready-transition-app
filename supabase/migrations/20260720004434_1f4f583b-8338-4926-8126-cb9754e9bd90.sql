CREATE OR REPLACE VIEW public.insight_precision_by_signal
WITH (security_invoker = true) AS
SELECT
  sig AS signal_id,
  insight_state,
  COUNT(*) FILTER (WHERE thumb = 1)  AS thumb_up,
  COUNT(*) FILTER (WHERE thumb = -1) AS thumb_down,
  COUNT(*)                            AS total,
  CASE WHEN COUNT(*) > 0
       THEN ROUND((COUNT(*) FILTER (WHERE thumb = 1))::numeric / COUNT(*)::numeric, 4)
       ELSE NULL END                  AS thumb_up_rate
FROM public.vcr_insight_feedback f,
     LATERAL unnest(COALESCE(f.signal_ids, ARRAY[]::integer[])) AS sig
GROUP BY sig, insight_state;

REVOKE ALL ON public.insight_precision_by_signal FROM PUBLIC;
GRANT SELECT ON public.insight_precision_by_signal TO authenticated;
GRANT ALL    ON public.insight_precision_by_signal TO service_role;