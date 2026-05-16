
-- Competence Management System (CMS)

-- Enums
CREATE TYPE public.cms_activity_type AS ENUM ('vendor_training','ojt','assessment','certification','e_learning','mentoring','other');
CREATE TYPE public.cms_progress_status AS ENUM ('not_started','in_progress','assessed','competent','expired');
CREATE TYPE public.cms_activity_record_status AS ENUM ('planned','in_progress','completed','failed');

-- Tables
CREATE TABLE public.competence_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.competence_profile_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.competence_profiles(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 1,
  required_level int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, competency_id)
);

CREATE TABLE public.competence_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id uuid NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  activity_type public.cms_activity_type NOT NULL DEFAULT 'other',
  duration_hours numeric,
  provider text,
  target_completion_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cms_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  staff_id text NOT NULL UNIQUE,
  plant_id uuid,
  job_title text,
  profile_id uuid REFERENCES public.competence_profiles(id) ON DELETE SET NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.person_competency_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.cms_people(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  progress int NOT NULL DEFAULT 0,
  status public.cms_progress_status NOT NULL DEFAULT 'not_started',
  last_assessed_at timestamptz,
  assessor_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(person_id, competency_id)
);

CREATE TABLE public.person_activity_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.cms_people(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.competence_activities(id) ON DELETE CASCADE,
  status public.cms_activity_record_status NOT NULL DEFAULT 'planned',
  completed_at timestamptz,
  score numeric,
  evidence_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger reuse
CREATE TRIGGER trg_competence_profiles_updated BEFORE UPDATE ON public.competence_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_competencies_updated BEFORE UPDATE ON public.competencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_competence_activities_updated BEFORE UPDATE ON public.competence_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cms_people_updated BEFORE UPDATE ON public.cms_people FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_person_competency_progress_updated BEFORE UPDATE ON public.person_competency_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_person_activity_records_updated BEFORE UPDATE ON public.person_activity_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- View: overall progress per person (weighted avg across competencies in assigned profile)
CREATE OR REPLACE VIEW public.v_person_overall_progress AS
SELECT
  p.id AS person_id,
  p.profile_id,
  COALESCE(
    ROUND(
      SUM(COALESCE(pcp.progress,0) * ppc.weight)::numeric / NULLIF(SUM(ppc.weight),0)
    , 0)::int
  , 0) AS overall_progress,
  COUNT(ppc.competency_id) AS total_competencies,
  COUNT(pcp.id) FILTER (WHERE pcp.status = 'competent') AS competent_count
FROM public.cms_people p
LEFT JOIN public.competence_profile_competencies ppc ON ppc.profile_id = p.profile_id
LEFT JOIN public.person_competency_progress pcp
  ON pcp.person_id = p.id AND pcp.competency_id = ppc.competency_id
GROUP BY p.id, p.profile_id;

-- Enable RLS
ALTER TABLE public.competence_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competence_profile_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competence_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_competency_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_activity_records ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read & write (admin tooling - tighten later via roles if needed)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'competence_profiles','competencies','competence_profile_competencies',
    'competence_activities','cms_people','person_competency_progress','person_activity_records'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "auth read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (true);', t);
    EXECUTE format('CREATE POLICY "auth insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "auth update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (true) WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "auth delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (true);', t);
  END LOOP;
END$$;

-- Seed data
INSERT INTO public.competence_profiles (id, name, code, description) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Control Room Operator', 'CRO', 'Operates plant control room systems'),
  ('11111111-1111-1111-1111-111111111102', 'Field Operator', 'FO', 'Field operations and equipment monitoring'),
  ('11111111-1111-1111-1111-111111111103', 'Shift Engineer / Supervisor', 'SE', 'Shift leadership and engineering oversight');

INSERT INTO public.competencies (id, title, description) VALUES
  ('22222222-2222-2222-2222-222222222201', 'DCS Operations', 'Operate distributed control systems safely'),
  ('22222222-2222-2222-2222-222222222202', 'Emergency Shutdown', 'Execute ESD procedures'),
  ('22222222-2222-2222-2222-222222222203', 'Permit to Work', 'Manage PTW system'),
  ('22222222-2222-2222-2222-222222222204', 'Process Safety', 'Apply PSM principles'),
  ('22222222-2222-2222-2222-222222222205', 'Field Inspection Rounds', 'Conduct routine field inspections'),
  ('22222222-2222-2222-2222-222222222206', 'Leadership & Coaching', 'Lead and coach shift teams');

INSERT INTO public.competence_profile_competencies (profile_id, competency_id, weight) VALUES
  ('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222201',2),
  ('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222202',2),
  ('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222203',1),
  ('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222204',1),
  ('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222203',1),
  ('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222205',2),
  ('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222204',1),
  ('11111111-1111-1111-1111-111111111103','22222222-2222-2222-2222-222222222204',2),
  ('11111111-1111-1111-1111-111111111103','22222222-2222-2222-2222-222222222206',2),
  ('11111111-1111-1111-1111-111111111103','22222222-2222-2222-2222-222222222203',1);

INSERT INTO public.competence_activities (competency_id, title, activity_type, provider, duration_hours) VALUES
  ('22222222-2222-2222-2222-222222222201','DCS Vendor Training - Honeywell','vendor_training','Honeywell',40),
  ('22222222-2222-2222-2222-222222222201','DCS OJT - 3 months console','ojt','Internal',480),
  ('22222222-2222-2222-2222-222222222202','ESD Simulator Assessment','assessment','Internal',8),
  ('22222222-2222-2222-2222-222222222203','PTW Certification','certification','HSE Dept',16),
  ('22222222-2222-2222-2222-222222222204','PSM e-Learning','e_learning','LMS',20),
  ('22222222-2222-2222-2222-222222222205','Field Rounds OJT','ojt','Internal',80),
  ('22222222-2222-2222-2222-222222222206','Leadership Mentoring Program','mentoring','HR',60);

INSERT INTO public.cms_people (id, first_name, last_name, staff_id, job_title, profile_id) VALUES
  ('33333333-3333-3333-3333-333333333301','Ahmed','Khan','EMP-1001','Control Room Operator','11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333302','Sara','Lee','EMP-1002','Control Room Operator','11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333303','Mohammed','Ali','EMP-1003','Field Operator','11111111-1111-1111-1111-111111111102'),
  ('33333333-3333-3333-3333-333333333304','Linda','Park','EMP-1004','Field Operator','11111111-1111-1111-1111-111111111102'),
  ('33333333-3333-3333-3333-333333333305','James','Wong','EMP-1005','Shift Engineer','11111111-1111-1111-1111-111111111103');

INSERT INTO public.person_competency_progress (person_id, competency_id, progress, status) VALUES
  ('33333333-3333-3333-3333-333333333301','22222222-2222-2222-2222-222222222201',85,'competent'),
  ('33333333-3333-3333-3333-333333333301','22222222-2222-2222-2222-222222222202',70,'assessed'),
  ('33333333-3333-3333-3333-333333333301','22222222-2222-2222-2222-222222222203',60,'in_progress'),
  ('33333333-3333-3333-3333-333333333301','22222222-2222-2222-2222-222222222204',40,'in_progress'),
  ('33333333-3333-3333-3333-333333333302','22222222-2222-2222-2222-222222222201',50,'in_progress'),
  ('33333333-3333-3333-3333-333333333302','22222222-2222-2222-2222-222222222202',30,'in_progress'),
  ('33333333-3333-3333-3333-333333333302','22222222-2222-2222-2222-222222222203',0,'not_started'),
  ('33333333-3333-3333-3333-333333333303','22222222-2222-2222-2222-222222222203',80,'assessed'),
  ('33333333-3333-3333-3333-333333333303','22222222-2222-2222-2222-222222222205',90,'competent'),
  ('33333333-3333-3333-3333-333333333303','22222222-2222-2222-2222-222222222204',55,'in_progress'),
  ('33333333-3333-3333-3333-333333333304','22222222-2222-2222-2222-222222222205',45,'in_progress'),
  ('33333333-3333-3333-3333-333333333305','22222222-2222-2222-2222-222222222204',95,'competent'),
  ('33333333-3333-3333-3333-333333333305','22222222-2222-2222-2222-222222222206',75,'assessed'),
  ('33333333-3333-3333-3333-333333333305','22222222-2222-2222-2222-222222222203',85,'competent');
