-- Strip leading "ST/DP{numbers}" prefix (with optional dash/space) from project_name
UPDATE dms_projects 
SET project_name = trim(regexp_replace(project_name, '^ST/DP[0-9]+\s*[-–]?\s*', '', 'i')),
    updated_at = now()
WHERE project_name ~* '^ST/DP[0-9]+';