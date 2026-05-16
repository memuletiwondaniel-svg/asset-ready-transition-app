ALTER TABLE public.cms_people 
  ADD COLUMN IF NOT EXISTS field_id uuid REFERENCES public.field(id),
  ADD COLUMN IF NOT EXISTS station_id uuid REFERENCES public.station(id);