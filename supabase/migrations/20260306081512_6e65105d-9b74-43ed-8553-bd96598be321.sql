UPDATE user_tasks
SET metadata = jsonb_set(
  jsonb_set(metadata::jsonb, '{project_code}', '"DP300"'),
  '{project_name}', '"HM Additional Compressors"'
)
WHERE id = '6c77b7ff-83ee-414b-9a0c-dd41d8705790';