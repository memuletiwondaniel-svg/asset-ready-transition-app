UPDATE user_tasks 
SET metadata = jsonb_set(metadata::jsonb, '{completion_percentage}', '0')
WHERE id IN ('e489c5ce-d594-490b-a4e9-c74b6319a166', '8575cb8a-128c-4b8b-867e-0cd3aeccf605');