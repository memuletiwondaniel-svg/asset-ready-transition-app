-- Relabel oracle 08X (subsystem C013-DP18A-08X) rows from prefix-derived 'C013'
-- to the canonical p2a-style plant code 'DP-18A'. No DP-18A rows exist yet,
-- so straight UPDATE is safe wrt unique keys.
UPDATE public.gohub_itr_items     SET project_code = 'DP-18A' WHERE project_code = 'C013';
UPDATE public.gohub_punch_items   SET project_code = 'DP-18A' WHERE project_code = 'C013';
UPDATE public.gohub_certificates  SET project_code = 'DP-18A' WHERE project_code = 'C013';