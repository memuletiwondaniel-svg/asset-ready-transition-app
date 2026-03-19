-- Document numbering configuration segments
CREATE TABLE public.dms_numbering_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  segment_key text NOT NULL,
  label text NOT NULL,
  position int NOT NULL DEFAULT 1,
  separator text NOT NULL DEFAULT '-',
  min_length int NOT NULL DEFAULT 1,
  max_length int NOT NULL DEFAULT 10,
  source_table text,
  source_code_column text,
  source_name_column text,
  is_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  example_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-set tenant_id
CREATE TRIGGER set_tenant_id_dms_numbering
  BEFORE INSERT ON public.dms_numbering_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_user();

-- Updated_at trigger
CREATE TRIGGER update_dms_numbering_segments_updated_at
  BEFORE UPDATE ON public.dms_numbering_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.dms_numbering_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view numbering segments"
  ON public.dms_numbering_segments FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can insert numbering segments"
  ON public.dms_numbering_segments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Tenant users can update numbering segments"
  ON public.dms_numbering_segments FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can delete numbering segments"
  ON public.dms_numbering_segments FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- Seed default segments (tenant_id set by trigger)
INSERT INTO public.dms_numbering_segments (segment_key, label, position, separator, min_length, max_length, source_table, source_code_column, source_name_column, is_required, description, example_value) VALUES
  ('project',     'Project Code',    1, '-', 4, 6,  'dms_projects',    'code', 'project_name', true,  'Project identifier from the Projects table', '6529'),
  ('originator',  'Originator Code', 2, '-', 3, 6,  'dms_originators', 'code', 'description',  true,  'Organization or company code from the Originators table', 'AMTS'),
  ('plant',       'Plant Code',      3, '-', 4, 6,  'dms_plants',      'code', 'plant_name',   true,  'Plant or facility code from the Plants table', 'S003'),
  ('site',        'Site Code',       4, '-', 4, 6,  'dms_sites',       'code', 'site_name',    true,  'Geographic site identifier from the Sites table', 'ISGP'),
  ('unit',        'Unit Code',       5, '-', 3, 8,  'dms_units',       'code', 'unit_name',    true,  'Process unit identifier from the Units table', 'U11000'),
  ('discipline',  'Discipline Code', 6, '-', 2, 4,  'dms_disciplines', 'code', 'name',         true,  'Engineering discipline code from the Disciplines table', 'PX'),
  ('document',    'Document Code',   7, '-', 3, 5,  'dms_document_types', 'code', 'document_name', true, 'Document type code from the Document Types table', '2365'),
  ('sequence_1',  'Sequence Number', 8, '-', 5, 5,  NULL, NULL, NULL, true,  'Primary sequential number for unique identification', '00001'),
  ('sequence_2',  'Revision/Sub-Seq',9, '',  3, 3,  NULL, NULL, NULL, false, 'Secondary sequence or revision indicator', '001');