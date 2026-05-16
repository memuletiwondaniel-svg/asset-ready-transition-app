-- Add required_milestone to profile-competency links
ALTER TABLE public.competence_profile_competencies
  ADD COLUMN IF NOT EXISTS required_milestone text NOT NULL DEFAULT 'mastery'
  CHECK (required_milestone IN ('knowledge', 'skill', 'mastery'));

-- Recompute overall progress against the required milestone target per competency
CREATE OR REPLACE VIEW public.v_person_overall_progress AS
WITH per_comp AS (
  SELECT
    p.id AS person_id,
    p.profile_id,
    ppc.competency_id,
    ppc.weight,
    COALESCE(pcp.progress, 0) AS progress,
    CASE ppc.required_milestone
      WHEN 'knowledge' THEN COALESCE(c.knowledge_threshold, 50)
      WHEN 'skill'     THEN COALESCE(c.skill_threshold, 75)
      ELSE                  COALESCE(c.mastery_threshold, 100)
    END AS target_threshold
  FROM public.cms_people p
  LEFT JOIN public.competence_profile_competencies ppc ON ppc.profile_id = p.profile_id
  LEFT JOIN public.competencies c ON c.id = ppc.competency_id
  LEFT JOIN public.person_competency_progress pcp
    ON pcp.person_id = p.id AND pcp.competency_id = ppc.competency_id
)
SELECT
  person_id,
  profile_id,
  COALESCE(
    ROUND(
      SUM(LEAST(100, (progress::numeric / NULLIF(target_threshold, 0)) * 100) * weight)
      / NULLIF(SUM(weight), 0)
    , 0)::int
  , 0) AS overall_progress,
  COUNT(competency_id) AS total_competencies,
  COUNT(*) FILTER (WHERE progress >= target_threshold AND competency_id IS NOT NULL) AS competent_count
FROM per_comp
GROUP BY person_id, profile_id;