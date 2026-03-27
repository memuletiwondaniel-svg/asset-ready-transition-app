CREATE TABLE IF NOT EXISTS dms_document_type_acronyms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  acronym text NOT NULL UNIQUE,
  type_code text NOT NULL,
  full_name text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO dms_document_type_acronyms (acronym, type_code, full_name, notes) VALUES
  ('BFD',  '7704', 'Basis of Design', 'Also written as BfD'),
  ('BFE',  '7179', 'Basis of Estimate', null),
  ('FAT',  'H04',  'Factory Acceptance Test Procedure', 'For FAT Report use K05'),
  ('FATR', 'K05',  'Factory Acceptance Test Report', 'FAT Report/Record'),
  ('SAT',  'H05',  'Site Acceptance Test Procedure', null),
  ('ITP',  'H02',  'Inspection and Test Plan', null),
  ('CE',   'C14',  'Cause & Effect Charts', 'Also written as C&E'),
  ('PSM',  '7411', 'Safety Management Review Report', 'Process Safety Management'),
  ('CDB',  'K10',  'Certification Data Book / Index', 'Also: Data Book'),
  ('PCOM', 'J06',  'Pre-commissioning / Commissioning Procedure', 'Also: Pre-com'),
  ('COM',  '6008', 'Commissioning Procedure', null),
  ('HYD',  'H07',  'Hydrostat/Flushing/Pneumatic Test Procedure', 'Hydrotest'),
  ('PTR',  'H09',  'Hydrostatic / Pressure Test Record', null),
  ('SDR',  'A01',  'Supplier Document Register', 'Master Document Register'),
  ('GA',   'B01',  'General Arrangement Drawing', 'Also: GAD'),
  ('SLD',  'C03',  'Single Line Diagram', null),
  ('IOM',  'J01',  'Installation, Operation and Maintenance Manual', 'Also: O&M Manual'),
  ('HAC',  '2334', 'Hazardous Area Classification Diagram', 'Also: HAZOP related'),
  ('SIL',  '1222', 'Safety Integrity Level Calculation', 'SIL assessment'),
  ('HAR',  '0505', 'Hazard Analysis Report', null),
  ('RAR',  '0709', 'Risk Assessment Report', null);

ALTER TABLE dms_document_type_acronyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all authenticated users"
  ON dms_document_type_acronyms FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users"
  ON dms_document_type_acronyms FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users"
  ON dms_document_type_acronyms FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users"
  ON dms_document_type_acronyms FOR DELETE
  USING (auth.role() = 'authenticated');