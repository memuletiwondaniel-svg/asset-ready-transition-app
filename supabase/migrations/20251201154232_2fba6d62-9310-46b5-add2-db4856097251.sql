-- Add status column to project_milestones table
ALTER TABLE project_milestones 
ADD COLUMN status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'in_progress', 'completed'));