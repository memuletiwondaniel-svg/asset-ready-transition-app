ALTER TABLE public.dms_projects ADD COLUMN IF NOT EXISTS proj_seq_nr text;
UPDATE public.dms_projects SET proj_seq_nr = '59734' WHERE code = '6529';