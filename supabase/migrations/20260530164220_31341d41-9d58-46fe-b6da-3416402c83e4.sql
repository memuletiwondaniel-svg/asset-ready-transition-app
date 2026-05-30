ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS field_id uuid REFERENCES public.field(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_field_id ON public.projects(field_id);

DROP VIEW IF EXISTS public.projects_enriched;

CREATE VIEW public.projects_enriched AS
SELECT p.id,
    p.project_id_prefix,
    p.project_id_number,
    p.project_title,
    p.plant_id,
    p.field_id,
    p.station_id,
    p.project_scope,
    p.project_scope_image_url,
    p.hub_id,
    p.created_by,
    p.created_at,
    p.updated_at,
    p.is_active,
    p.region_id,
    p.is_favorite,
    pl.name AS plant_name,
    f.name AS field_name,
    s.name AS station_name,
    h.name AS hub_name,
    COALESCE(tm.team_count, 0) AS team_count,
    tm.team_lead_user_id,
    pr.full_name AS team_lead_name,
    pr.avatar_url AS team_lead_avatar,
    COALESCE(ms.milestone_count, 0) AS milestone_count,
    COALESCE(ms.completed_milestone_count, 0) AS completed_milestone_count,
    ms.next_milestone_name,
    ms.next_milestone_date,
    COALESCE(ms.is_scorecard, false) AS is_scorecard,
    COALESCE(dc.document_count, 0) AS document_count
   FROM projects p
     LEFT JOIN plant pl ON p.plant_id = pl.id
     LEFT JOIN field f ON p.field_id = f.id
     LEFT JOIN station s ON p.station_id = s.id
     LEFT JOIN hubs h ON p.hub_id = h.id
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS team_count,
            ( SELECT ptm2.user_id
                   FROM project_team_members ptm2
                  WHERE ptm2.project_id = p.id AND ptm2.is_lead = true
                 LIMIT 1) AS team_lead_user_id
           FROM project_team_members
          WHERE project_team_members.project_id = p.id) tm ON true
     LEFT JOIN profiles pr ON pr.user_id = tm.team_lead_user_id
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS milestone_count,
            count(*) FILTER (WHERE project_milestones.status = 'Completed'::text)::integer AS completed_milestone_count,
            ( SELECT pm2.milestone_name
                   FROM project_milestones pm2
                  WHERE pm2.project_id = p.id AND pm2.status <> 'Completed'::text
                  ORDER BY pm2.milestone_date
                 LIMIT 1) AS next_milestone_name,
            ( SELECT pm2.milestone_date
                   FROM project_milestones pm2
                  WHERE pm2.project_id = p.id AND pm2.status <> 'Completed'::text
                  ORDER BY pm2.milestone_date
                 LIMIT 1) AS next_milestone_date,
            bool_or(project_milestones.is_scorecard_project) AS is_scorecard
           FROM project_milestones
          WHERE project_milestones.project_id = p.id) ms ON true
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS document_count
           FROM project_documents
          WHERE project_documents.project_id = p.id) dc ON true
  WHERE p.is_active = true;

GRANT SELECT ON public.projects_enriched TO anon, authenticated;
GRANT ALL ON public.projects_enriched TO service_role;