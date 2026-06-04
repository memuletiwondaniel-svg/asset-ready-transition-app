-- 0a: delete junk cert rows (placeholder, no dates at all)
DELETE FROM public.gohub_certificates
WHERE planned_date IS NULL
  AND actual_date IS NULL
  AND (object_id IS NULL OR btrim(replace(object_id,'&nbsp;','')) = '');

-- 0b: 08X probe duplicate cleanup.
-- Strategy: for each unique key, if a 'C013' row exists, drop the variant;
-- otherwise relabel the variant to 'C013'.

-- punch
DELETE FROM public.gohub_punch_items v
WHERE v.subsystem_number = 'C013-DP18A-08X'
  AND v.project_code IN ('WEST QURNA','DP-18A')
  AND EXISTS (
    SELECT 1 FROM public.gohub_punch_items c
    WHERE c.project_code = 'C013'
      AND c.punchlist = v.punchlist
      AND c.item_no  = v.item_no
  );
UPDATE public.gohub_punch_items
SET project_code = 'C013'
WHERE subsystem_number = 'C013-DP18A-08X'
  AND project_code IN ('WEST QURNA','DP-18A');

-- itr
DELETE FROM public.gohub_itr_items v
WHERE v.subsystem_number = 'C013-DP18A-08X'
  AND v.project_code IN ('WEST QURNA','DP-18A')
  AND EXISTS (
    SELECT 1 FROM public.gohub_itr_items c
    WHERE c.project_code = 'C013'
      AND c.subsystem_number = v.subsystem_number
      AND c.tag_guid  = v.tag_guid
      AND c.itr_code  = v.itr_code
  );
UPDATE public.gohub_itr_items
SET project_code = 'C013'
WHERE subsystem_number = 'C013-DP18A-08X'
  AND project_code IN ('WEST QURNA','DP-18A');

-- certificates
DELETE FROM public.gohub_certificates v
WHERE v.subsystem_number = 'C013-DP18A-08X'
  AND v.project_code IN ('WEST QURNA','DP-18A')
  AND EXISTS (
    SELECT 1 FROM public.gohub_certificates c
    WHERE c.project_code = 'C013'
      AND c.cert_type  = v.cert_type
      AND c.object_id  = v.object_id
      AND COALESCE(c.discipline,'') = COALESCE(v.discipline,'')
  );
UPDATE public.gohub_certificates
SET project_code = 'C013'
WHERE subsystem_number = 'C013-DP18A-08X'
  AND project_code IN ('WEST QURNA','DP-18A');