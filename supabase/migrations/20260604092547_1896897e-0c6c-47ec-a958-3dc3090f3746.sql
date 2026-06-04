-- Per-row relabel: derive project_code from subsystem_number for any gohub_* row whose
-- project_code is a tile name (or otherwise does not match DP-##X). Tile names conflate
-- DP18A and DP18F and must never persist.

DO $$
DECLARE
  v_certs int;
  v_itr int;
  v_punch int;
BEGIN
  -- gohub_certificates: relabel rows whose subsystem_number parses to a DP-##X project
  WITH candidates AS (
    SELECT id,
           regexp_replace(split_part(subsystem_number, '-', 2), '^DP([0-9]+)([A-Z])$', 'DP-\1\2') AS derived
    FROM public.gohub_certificates
    WHERE project_code !~ '^DP-[0-9]+[A-Z]$'
      AND subsystem_number ~ '^C[0-9]+-DP[0-9]+[A-Z]-'
  ),
  -- Skip any row that would collide on the unique key (project_code, cert_type, object_id, discipline)
  safe AS (
    SELECT c.id, c.derived
    FROM candidates c
    JOIN public.gohub_certificates src ON src.id = c.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.gohub_certificates t
      WHERE t.project_code = c.derived
        AND t.cert_type = src.cert_type
        AND t.object_id = src.object_id
        AND COALESCE(t.discipline, '') = COALESCE(src.discipline, '')
        AND t.id <> c.id
    )
  )
  UPDATE public.gohub_certificates g
  SET project_code = s.derived
  FROM safe s
  WHERE g.id = s.id;
  GET DIAGNOSTICS v_certs = ROW_COUNT;

  WITH candidates AS (
    SELECT id, regexp_replace(split_part(subsystem_number, '-', 2), '^DP([0-9]+)([A-Z])$', 'DP-\1\2') AS derived
    FROM public.gohub_itr_items
    WHERE project_code !~ '^DP-[0-9]+[A-Z]$'
      AND subsystem_number ~ '^C[0-9]+-DP[0-9]+[A-Z]-'
  ),
  safe AS (
    SELECT c.id, c.derived FROM candidates c
    JOIN public.gohub_itr_items src ON src.id = c.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.gohub_itr_items t
      WHERE t.project_code = c.derived AND t.subsystem_number = src.subsystem_number
        AND t.tag_guid = src.tag_guid AND t.itr_code = src.itr_code AND t.id <> c.id
    )
  )
  UPDATE public.gohub_itr_items g SET project_code = s.derived FROM safe s WHERE g.id = s.id;
  GET DIAGNOSTICS v_itr = ROW_COUNT;

  WITH candidates AS (
    SELECT id, regexp_replace(split_part(subsystem_number, '-', 2), '^DP([0-9]+)([A-Z])$', 'DP-\1\2') AS derived
    FROM public.gohub_punch_items
    WHERE project_code !~ '^DP-[0-9]+[A-Z]$'
      AND subsystem_number ~ '^C[0-9]+-DP[0-9]+[A-Z]-'
  ),
  safe AS (
    SELECT c.id, c.derived FROM candidates c
    JOIN public.gohub_punch_items src ON src.id = c.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.gohub_punch_items t
      WHERE t.project_code = c.derived AND t.punchlist = src.punchlist
        AND t.item_no = src.item_no AND t.id <> c.id
    )
  )
  UPDATE public.gohub_punch_items g SET project_code = s.derived FROM safe s WHERE g.id = s.id;
  GET DIAGNOSTICS v_punch = ROW_COUNT;

  RAISE NOTICE 'Relabeled rows -> certs: %, itr: %, punch: %', v_certs, v_itr, v_punch;
END $$;