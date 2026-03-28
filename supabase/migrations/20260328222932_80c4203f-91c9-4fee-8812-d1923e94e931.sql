INSERT INTO dms_document_type_acronyms (acronym, type_code, full_name, notes, is_learned)
VALUES 
  ('PEFS', 'C01', 'Process Engineering Flow Sheets', 'Also covers BGC code 2365 (Process Engineering Flow Scheme). Cross-discipline auto-combine handles both.', false),
  ('PID', 'C01', 'Piping and Instrument Diagram', 'Vendor P&ID documents use code C01', false),
  ('P&ID', 'C01', 'Piping and Instrument Diagram', 'Vendor P&ID documents use code C01', false),
  ('PSDB', '6400', 'Process Safety Design Basis', 'Process safety design basis document', false)
ON CONFLICT (acronym) DO NOTHING;