
CREATE TABLE public.dms_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  site_name TEXT NOT NULL,
  comment TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dms_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access on dms_sites" ON public.dms_sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert access on dms_sites" ON public.dms_sites FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update access on dms_sites" ON public.dms_sites FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete access on dms_sites" ON public.dms_sites FOR DELETE TO authenticated USING (true);

INSERT INTO public.dms_sites (code, site_name, comment, display_order) VALUES
('BNGL', 'Basrah NGL', NULL, 1),
('GE00', 'General', 'Applicable to all Plants, to be used for document numbering purposes only.', 2),
('ISGP', 'Iraq South Gas', 'Iraq South Gas Project', 3),
('IDSR', 'Multiple', 'Infrastructure Development for Corporate Social Responsibilty', 4);
