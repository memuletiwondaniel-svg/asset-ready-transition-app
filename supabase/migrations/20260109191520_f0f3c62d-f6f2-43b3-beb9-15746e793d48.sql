-- Add new columns to ora_training_items table
ALTER TABLE ora_training_items 
ADD COLUMN IF NOT EXISTS scheduled_end_date DATE,
ADD COLUMN IF NOT EXISTS po_status TEXT DEFAULT 'PENDING' CHECK (po_status IN ('PENDING', 'ISSUED'));

-- Update mock training items with varied execution stages
-- Item 1: Completed with PO Issued
UPDATE ora_training_items SET 
  execution_stage = 'COMPLETED',
  scheduled_date = '2026-01-05',
  scheduled_end_date = '2026-01-10',
  po_status = 'ISSUED',
  po_number = 'PO-2026-0001',
  po_issued_date = '2026-01-03',
  completion_date = '2026-01-10'
WHERE title = 'Process Safety Fundamentals';

-- Item 2: In Progress with PO Issued
UPDATE ora_training_items SET 
  execution_stage = 'IN_PROGRESS',
  scheduled_date = '2026-01-08',
  scheduled_end_date = '2026-01-15',
  po_status = 'ISSUED',
  po_number = 'PO-2026-0002',
  po_issued_date = '2026-01-06'
WHERE title = 'DCS Operations Training';

-- Item 3: Not Started with PO Pending
UPDATE ora_training_items SET 
  execution_stage = 'NOT_STARTED',
  scheduled_date = '2026-02-01',
  scheduled_end_date = '2026-02-05',
  po_status = 'PENDING'
WHERE title = 'Emergency Response Procedures';

-- Item 4: Not Started with PO Pending
UPDATE ora_training_items SET 
  execution_stage = 'NOT_STARTED',
  scheduled_date = '2026-02-15',
  scheduled_end_date = '2026-02-20',
  po_status = 'PENDING'
WHERE title = 'Equipment Maintenance Certification';