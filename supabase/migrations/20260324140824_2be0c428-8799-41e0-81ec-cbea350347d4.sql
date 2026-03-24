-- Update existing dms_document_types rows with scope, MDR, and vendor flags

-- Project-scope documents
UPDATE dms_document_types SET document_scope = 'project'
WHERE document_name ILIKE '%HAZOP%'
  OR document_name ILIKE '%MDR%'
  OR document_name ILIKE '%master document%'
  OR document_name ILIKE '%project completion%'
  OR document_name ILIKE '%handover certificate%'
  OR document_name ILIKE '%basis of design%'
  OR document_name ILIKE '%BDEP%';

-- MDR flags
UPDATE dms_document_types SET is_mdr = TRUE
WHERE document_name ILIKE '%master document register%'
  OR document_name ILIKE '%MDR%'
  OR document_name ILIKE '%master deliverable%';

-- Vendor document flags
UPDATE dms_document_types SET is_vendor_document = TRUE
WHERE code ILIKE '%ZV%';

-- Fill remaining NULL document_scope with 'discipline'
UPDATE dms_document_types SET document_scope = 'discipline'
WHERE document_scope IS NULL;