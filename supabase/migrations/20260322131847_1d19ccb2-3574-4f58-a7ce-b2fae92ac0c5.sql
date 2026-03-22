-- Fix remaining leading dashes/spaces from previous cleanup
UPDATE dms_projects
SET project_name = trim(regexp_replace(project_name, '^[-–]\s*', '', '')),
    updated_at = now()
WHERE project_name ~ '^[-–]\s';