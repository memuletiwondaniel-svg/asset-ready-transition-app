UPDATE pssrs SET status = 'Draft' WHERE id = 'cf35bb18-deec-4830-b594-b8776dee44da';

UPDATE user_tasks SET status = 'cancelled' WHERE type = 'pssr_review' AND (metadata->>'pssr_id')::text = 'cf35bb18-deec-4830-b594-b8776dee44da' AND status = 'pending';