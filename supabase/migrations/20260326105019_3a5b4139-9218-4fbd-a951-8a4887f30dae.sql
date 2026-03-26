DROP TABLE IF EXISTS public.agent_navigation_steps CASCADE;

CREATE TABLE public.agent_navigation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL DEFAULT 'assai',
  step_order INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  selector TEXT,
  value TEXT,
  description TEXT NOT NULL,
  wait_ms INTEGER DEFAULT 1000,
  on_failure TEXT DEFAULT 'stop',
  max_retries INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform, step_order)
);

ALTER TABLE public.agent_navigation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read navigation steps"
  ON public.agent_navigation_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage navigation steps"
  ON public.agent_navigation_steps FOR ALL
  TO authenticated
  USING (public.user_is_admin((SELECT auth.uid())))
  WITH CHECK (public.user_is_admin((SELECT auth.uid())));

INSERT INTO public.agent_navigation_steps (platform, step_order, action_type, selector, value, description, wait_ms, on_failure)
VALUES
  ('assai', 1, 'navigate', NULL, '{{base_url}}', 'Navigate to Assai login page', 3000, 'stop'),
  ('assai', 2, 'wait', '#loginForm, input[name="username"], input[name="j_username"]', NULL, 'Wait for login form to load', 5000, 'stop'),
  ('assai', 3, 'input', 'input[name="username"], input[name="j_username"]', '{{username}}', 'Enter username', 500, 'stop'),
  ('assai', 4, 'input', 'input[name="password"], input[name="j_password"]', '{{password}}', 'Enter password', 500, 'stop'),
  ('assai', 5, 'click', 'button[type="submit"], input[type="submit"], #loginButton', NULL, 'Click login button', 3000, 'stop'),
  ('assai', 6, 'wait', '#mainContent, .dashboard, .project-list, .assai-main', NULL, 'Wait for dashboard to confirm login success', 5000, 'retry'),
  ('assai', 7, 'extract', 'title, .welcome-message, .user-info', NULL, 'Extract page title to verify logged-in state', 1000, 'skip');