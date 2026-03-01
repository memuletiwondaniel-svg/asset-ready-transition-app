
-- Allow anonymous/unauthenticated reads of tenant slug/name/logo for login page branding
CREATE POLICY "Public can resolve tenant by slug"
  ON public.tenants FOR SELECT TO anon
  USING (is_active = true);
