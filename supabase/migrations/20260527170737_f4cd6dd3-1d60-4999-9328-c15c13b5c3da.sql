
-- Add PCAP Control Point Number column
ALTER TABLE public.ora_activity_catalog
  ADD COLUMN IF NOT EXISTS pcap_control_point_number TEXT;

-- Renumber activity_code from <PREFIX>-NN to letter.NN style
-- ASS -> A, SEL -> S, DEF -> D, EXE -> E
UPDATE public.ora_activity_catalog
SET activity_code = CASE
  WHEN activity_code LIKE 'ASS-%' THEN 'A.' || substring(activity_code from 5)
  WHEN activity_code LIKE 'SEL-%' THEN 'S.' || substring(activity_code from 5)
  WHEN activity_code LIKE 'DEF-%' THEN 'D.' || substring(activity_code from 5)
  WHEN activity_code LIKE 'EXE-%' THEN 'E.' || substring(activity_code from 5)
  WHEN activity_code LIKE 'IDN-%' THEN 'I.' || substring(activity_code from 5)
  WHEN activity_code LIKE 'OPR-%' THEN 'O.' || substring(activity_code from 5)
  ELSE activity_code
END
WHERE activity_code ~ '^(ASS|SEL|DEF|EXE|IDN|OPR)-';
