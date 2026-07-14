
CREATE OR REPLACE FUNCTION public.trg_kick_vcr_insights_on_prereq_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_url text := 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/compute-vcr-insights';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbnJqcWpib251dnB4eGZ2ZmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODgwMjgsImV4cCI6MjA2ODY2NDAyOH0.tj1l_8eFDnHvAJKxEEHjQMid8l9vGG0mNIFlK6b6HKM';
BEGIN
  IF NEW.handover_point_id IS NULL OR NEW.vcr_item_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
      body := jsonb_build_object(
        'vcr_id', NEW.handover_point_id,
        'vcr_item_id', NEW.vcr_item_id,
        'force', false,
        'source', 'pg_trigger'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'compute-vcr-insights kick failed for prereq %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Replay backfill with source:"pg_trigger" so the edge function accepts.
DO $$
DECLARE
  r RECORD;
  v_url  text := 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/compute-vcr-insights';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbnJqcWpib251dnB4eGZ2ZmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODgwMjgsImV4cCI6MjA2ODY2NDAyOH0.tj1l_8eFDnHvAJKxEEHjQMid8l9vGG0mNIFlK6b6HKM';
  v_fired int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT i.vcr_id, i.vcr_item_id
    FROM public.vcr_item_insights i
    JOIN public.p2a_vcr_prerequisites p
      ON p.handover_point_id = i.vcr_id AND p.vcr_item_id = i.vcr_item_id
    WHERE i.computed_at < p.updated_at
  LOOP
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
      body := jsonb_build_object(
        'vcr_id', r.vcr_id,
        'vcr_item_id', r.vcr_item_id,
        'force', true,
        'source', 'pg_trigger'
      )
    );
    v_fired := v_fired + 1;
  END LOOP;
  RAISE NOTICE 'insight backfill re-kicked % pairs', v_fired;
END $$;
