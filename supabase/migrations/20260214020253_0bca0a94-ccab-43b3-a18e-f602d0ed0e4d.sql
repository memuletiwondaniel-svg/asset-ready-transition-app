
-- Create missing VCR Template review tasks for Lee Gascoigne (TSE Manager)
-- for all 3 templates that have TSE Manager as pending approver
INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, metadata)
VALUES
  -- Pipelines template
  ('ff43d21f-67c9-4233-b4e3-f8f6e93c1e81', 'Review VCR Template: Pipelines',
   'A VCR template "Pipelines" has been submitted for your review and approval.',
   'review', 'Medium', 'pending',
   '{"template_id": "82c96f15-0f47-4f0f-8323-77d513714c9e", "template_name": "Pipelines"}'::jsonb),
  -- Template 2ebe8392
  ('ff43d21f-67c9-4233-b4e3-f8f6e93c1e81', 'Review VCR Template: Hydrocarbon Systems',
   'A VCR template "Hydrocarbon Systems" has been submitted for your review and approval.',
   'review', 'Medium', 'pending',
   '{"template_id": "2ebe8392-e404-4655-b9eb-46e4e3cb39e8", "template_name": "Hydrocarbon Systems"}'::jsonb),
  -- Template 363a831c
  ('ff43d21f-67c9-4233-b4e3-f8f6e93c1e81', 'Review VCR Template: Non-Hydrocarbon Systems',
   'A VCR template "Non-Hydrocarbon Systems" has been submitted for your review and approval.',
   'review', 'Medium', 'pending',
   '{"template_id": "363a831c-edb3-4224-a97f-2e8b11fac2dc", "template_name": "Non-Hydrocarbon Systems"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Also fix Graham's role to TSE Manager so future task creation picks him up
UPDATE public.profiles
SET role = '93506c27-f7b4-4194-ba94-defc52fafffd'
WHERE user_id = '3f170955-1b41-4280-8152-d49951315a48' AND role IS NULL;

-- Create tasks for Graham too
INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, metadata)
VALUES
  ('3f170955-1b41-4280-8152-d49951315a48', 'Review VCR Template: Pipelines',
   'A VCR template "Pipelines" has been submitted for your review and approval.',
   'review', 'Medium', 'pending',
   '{"template_id": "82c96f15-0f47-4f0f-8323-77d513714c9e", "template_name": "Pipelines"}'::jsonb),
  ('3f170955-1b41-4280-8152-d49951315a48', 'Review VCR Template: Hydrocarbon Systems',
   'A VCR template "Hydrocarbon Systems" has been submitted for your review and approval.',
   'review', 'Medium', 'pending',
   '{"template_id": "2ebe8392-e404-4655-b9eb-46e4e3cb39e8", "template_name": "Hydrocarbon Systems"}'::jsonb),
  ('3f170955-1b41-4280-8152-d49951315a48', 'Review VCR Template: Non-Hydrocarbon Systems',
   'A VCR template "Non-Hydrocarbon Systems" has been submitted for your review and approval.',
   'review', 'Medium', 'pending',
   '{"template_id": "363a831c-edb3-4224-a97f-2e8b11fac2dc", "template_name": "Non-Hydrocarbon Systems"}'::jsonb)
ON CONFLICT DO NOTHING;
