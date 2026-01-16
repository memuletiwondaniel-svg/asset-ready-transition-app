-- Create a materialized view for projects with enriched data
-- This will dramatically speed up the projects page loading

CREATE OR REPLACE VIEW public.projects_enriched AS
SELECT 
  p.*,
  pl.name as plant_name,
  s.name as station_name,
  h.name as hub_name,
  COALESCE(tm.team_count, 0) as team_count,
  tm.team_lead_user_id,
  pr.full_name as team_lead_name,
  pr.avatar_url as team_lead_avatar,
  COALESCE(ms.milestone_count, 0) as milestone_count,
  COALESCE(ms.completed_milestone_count, 0) as completed_milestone_count,
  ms.next_milestone_name,
  ms.next_milestone_date,
  COALESCE(ms.is_scorecard, false) as is_scorecard,
  COALESCE(dc.document_count, 0) as document_count
FROM projects p
LEFT JOIN plant pl ON p.plant_id = pl.id
LEFT JOIN station s ON p.station_id = s.id
LEFT JOIN hubs h ON p.hub_id = h.id
-- Team members aggregation
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*)::int as team_count,
    (SELECT user_id FROM project_team_members WHERE project_id = p.id AND is_lead = true LIMIT 1) as team_lead_user_id
  FROM project_team_members
  WHERE project_id = p.id
) tm ON true
-- Team lead profile
LEFT JOIN profiles pr ON pr.id = tm.team_lead_user_id
-- Milestones aggregation
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*)::int as milestone_count,
    COUNT(*) FILTER (WHERE milestone_date < NOW())::int as completed_milestone_count,
    (SELECT milestone_name FROM project_milestones WHERE project_id = p.id AND milestone_date >= NOW() ORDER BY milestone_date LIMIT 1) as next_milestone_name,
    (SELECT milestone_date FROM project_milestones WHERE project_id = p.id AND milestone_date >= NOW() ORDER BY milestone_date LIMIT 1) as next_milestone_date,
    BOOL_OR(is_scorecard_project) as is_scorecard
  FROM project_milestones
  WHERE project_id = p.id
) ms ON true
-- Documents count
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int as document_count
  FROM project_documents
  WHERE project_id = p.id
) dc ON true
WHERE p.is_active = true;

-- Add comment for documentation
COMMENT ON VIEW public.projects_enriched IS 'Pre-joined view of projects with plant, station, hub, team, milestones, and document counts for faster loading';

-- Create index on projects for faster lookups if not exists
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_project_team_members_project_id ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);