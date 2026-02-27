
-- Drop FK constraint temporarily
ALTER TABLE orp_activity_log DROP CONSTRAINT orp_activity_log_orp_plan_id_fkey;

-- Delete all related data
DELETE FROM orp_activity_log WHERE orp_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab');
DELETE FROM orp_comment_attachments WHERE comment_id IN (
  SELECT id FROM orp_deliverable_comments WHERE plan_deliverable_id IN (
    SELECT id FROM orp_plan_deliverables WHERE orp_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab')
));
DELETE FROM orp_deliverable_attachments WHERE plan_deliverable_id IN (
  SELECT id FROM orp_plan_deliverables WHERE orp_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab')
);
DELETE FROM orp_deliverable_comments WHERE plan_deliverable_id IN (
  SELECT id FROM orp_plan_deliverables WHERE orp_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab')
);
DELETE FROM orp_collaborators WHERE plan_deliverable_id IN (
  SELECT id FROM orp_plan_deliverables WHERE orp_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab')
);
DELETE FROM orp_deliverable_dependencies WHERE deliverable_id IN (
  SELECT id FROM orp_plan_deliverables WHERE orp_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab')
);
DELETE FROM orp_plan_deliverables WHERE orp_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab');
DELETE FROM orp_approvals WHERE orp_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab');
DELETE FROM ora_handover_items WHERE ora_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab');
DELETE FROM ora_maintenance_readiness WHERE ora_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab');
DELETE FROM ora_maintenance_batches WHERE ora_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab');
DELETE FROM ora_training_plans WHERE ora_plan_id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab');
DELETE FROM orp_plans WHERE id IN ('38da68ad-90d4-41f6-b498-a51250122f81', 'b2c3d4e5-f6a7-8901-bcde-f23456789012', '745d4b06-c598-4b1a-b5aa-e5ea58d461ab');

-- Delete orphaned activity log entries
DELETE FROM orp_activity_log WHERE orp_plan_id NOT IN (SELECT id FROM orp_plans);

-- Re-add FK constraint
ALTER TABLE orp_activity_log ADD CONSTRAINT orp_activity_log_orp_plan_id_fkey 
  FOREIGN KEY (orp_plan_id) REFERENCES orp_plans(id);

-- Add unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS orp_plans_one_active_per_project
ON orp_plans (project_id)
WHERE is_active = true;
