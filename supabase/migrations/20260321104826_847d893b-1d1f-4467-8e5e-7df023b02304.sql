
-- Junction table for secondary discipline classification on vendor (ZV) documents
CREATE TABLE public.dms_document_type_secondary_disciplines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type_id UUID NOT NULL REFERENCES public.dms_document_types(id) ON DELETE CASCADE,
  discipline_code TEXT NOT NULL,
  discipline_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_type_id, discipline_code)
);

-- Enable RLS
ALTER TABLE public.dms_document_type_secondary_disciplines ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read secondary disciplines"
ON public.dms_document_type_secondary_disciplines
FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can insert secondary disciplines"
ON public.dms_document_type_secondary_disciplines
FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete secondary disciplines"
ON public.dms_document_type_secondary_disciplines
FOR DELETE TO authenticated USING (true);

-- Index for fast lookups
CREATE INDEX idx_doc_type_secondary_disc_doc_id ON public.dms_document_type_secondary_disciplines(document_type_id);
CREATE INDEX idx_doc_type_secondary_disc_code ON public.dms_document_type_secondary_disciplines(discipline_code);
