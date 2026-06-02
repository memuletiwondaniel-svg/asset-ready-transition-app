WITH parent AS (
  INSERT INTO public.user_tasks (user_id, tenant_id, title, description, priority, type, status, progress_percentage, metadata)
  VALUES (
    '05b44255-4358-450c-8aa4-0558b31df70b',
    '63c14b6f-66d9-4963-bcd2-287662d538e2',
    'Deliver Training — [demo]',
    'Sandbox parent to preview fan-out expand/collapse UI. Safe to delete via demo_sandbox sweep.',
    'Medium', 'task', 'in_progress', 60,
    jsonb_build_object('project_id','7337f178-d1ff-4ff9-bc90-641895e515c0','demo_sandbox', true)
  ) RETURNING id
)
INSERT INTO public.user_tasks (user_id, tenant_id, title, priority, type, status, progress_percentage, parent_task_id, metadata)
SELECT
  '05b44255-4358-450c-8aa4-0558b31df70b',
  '63c14b6f-66d9-4963-bcd2-287662d538e2',
  t.title, 'Medium', 'task', t.status, t.pct, parent.id,
  jsonb_build_object('project_id','7337f178-d1ff-4ff9-bc90-641895e515c0','demo_sandbox',true)
FROM parent, (VALUES
  ('Training Module 1 — Compressor Operations'::text, 'completed'::text, 100),
  ('Training Module 2 — Safeguarding Systems', 'completed', 100),
  ('Training Module 3 — Dehydration Unit', 'completed', 100),
  ('Training Module 4 — EDG Procedures', 'in_progress', 0),
  ('Training Module 5 — Pipeline Handover', 'pending', 0)
) AS t(title, status, pct);