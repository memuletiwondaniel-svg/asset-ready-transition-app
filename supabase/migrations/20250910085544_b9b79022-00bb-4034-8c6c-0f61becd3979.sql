-- Allow anonymous checklist creation by making created_by nullable
ALTER TABLE public.checklists
ALTER COLUMN created_by DROP NOT NULL;

-- No change to update/delete policies; anonymous users will not be able to modify checklists later.
