-- Update first item: COMPLETED with PO Issued
UPDATE ora_training_items SET 
  execution_stage = 'COMPLETED',
  scheduled_date = '2026-01-02',
  scheduled_end_date = '2026-01-05',
  po_status = 'ISSUED',
  po_number = 'PO-2026-0001',
  po_issued_date = '2026-01-01',
  completion_date = '2026-01-05'
WHERE id = 'd6e7f8a9-b0c1-2345-defa-678901234567';

-- Update second item: MATERIALS_UNDER_REVIEW (In Review)
UPDATE ora_training_items SET 
  execution_stage = 'MATERIALS_UNDER_REVIEW',
  scheduled_date = '2026-01-15',
  scheduled_end_date = '2026-01-18',
  po_status = 'PENDING'
WHERE id = 'e7f8a9b0-c1d2-3456-efab-789012345678';

-- Update third item: IN_PROGRESS with PO Issued
UPDATE ora_training_items SET 
  execution_stage = 'IN_PROGRESS',
  scheduled_date = '2026-01-08',
  scheduled_end_date = '2026-01-12',
  po_status = 'ISSUED',
  po_number = 'PO-2026-0002',
  po_issued_date = '2026-01-06'
WHERE id = 'f8a9b0c1-d2e3-4567-fabc-890123456789';

-- Fourth item stays NOT_STARTED with PO Pending
UPDATE ora_training_items SET 
  execution_stage = 'NOT_STARTED',
  scheduled_date = '2026-02-01',
  scheduled_end_date = '2026-02-05',
  po_status = 'PENDING'
WHERE id = 'a9b0c1d2-e3f4-5678-abcd-901234567890';