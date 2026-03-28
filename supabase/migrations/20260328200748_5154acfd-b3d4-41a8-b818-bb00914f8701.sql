ALTER TABLE public.dms_projects 
  ADD CONSTRAINT dms_projects_code_cabinet_unique UNIQUE (code, cabinet);