REVOKE EXECUTE ON FUNCTION public.trg_rollup_completion_fn() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_rollup_completion_fn() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_rollup_completion_fn() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.trg_rollup_completion_fn() TO service_role;