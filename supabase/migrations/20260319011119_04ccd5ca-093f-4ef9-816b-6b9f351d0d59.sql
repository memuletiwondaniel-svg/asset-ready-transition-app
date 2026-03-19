
CREATE TABLE public.dms_status_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text NOT NULL,
  rev_suffix text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dms_status_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access on dms_status_codes"
  ON public.dms_status_codes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on dms_status_codes"
  ON public.dms_status_codes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on dms_status_codes"
  ON public.dms_status_codes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on dms_status_codes"
  ON public.dms_status_codes FOR DELETE TO authenticated USING (true);

INSERT INTO public.dms_status_codes (code, description, rev_suffix, display_order) VALUES
  ('IFR', 'Issued for Review', 'R', 1),
  ('IFA', 'Issued for Approval', 'A', 2),
  ('IFH', 'Issued for Hazop', 'R', 3),
  ('IFC', 'Issued for Construction', 'C', 4),
  ('IFI', 'Issued for Information', 'I', 5),
  ('CAN', 'Cancelled - To be used for WITHDRAWING existing revision of a document/drawing', 'X', 6),
  ('SUP', 'Superseded - To be used for REPLACING existing revision of a document/drawing', 'X', 7),
  ('AFD', 'Approved for Design', 'A', 8),
  ('AFH', 'Approved for Construction with Holds', 'H', 9),
  ('AFC', 'Approved for Construction', 'C', 10),
  ('AFT', 'Approved for Tender/Enquiry', 'A', 11),
  ('AFP', 'Approved for Purchase', 'A', 12),
  ('AFU', 'Approved for Use', 'A', 13),
  ('ASB', 'As Built', 'Z', 14),
  ('RLM', 'Red Line Markup', 'M', 15);
