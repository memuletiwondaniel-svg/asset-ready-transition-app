-- Enable realtime for ORP tables

-- Set replica identity to full for all ORP tables to capture complete row data
ALTER TABLE orp_plans REPLICA IDENTITY FULL;
ALTER TABLE orp_plan_deliverables REPLICA IDENTITY FULL;
ALTER TABLE orp_approvals REPLICA IDENTITY FULL;
ALTER TABLE orp_resources REPLICA IDENTITY FULL;
ALTER TABLE orp_collaborators REPLICA IDENTITY FULL;
ALTER TABLE orp_deliverable_attachments REPLICA IDENTITY FULL;
ALTER TABLE orp_deliverable_dependencies REPLICA IDENTITY FULL;