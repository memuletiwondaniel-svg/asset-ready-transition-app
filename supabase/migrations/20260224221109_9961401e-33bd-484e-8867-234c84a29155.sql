
-- Fix pssr_reasons: Add explicit INSERT/UPDATE/DELETE policies for authenticated admins
CREATE POLICY "Admins can insert pssr reasons"
ON public.pssr_reasons FOR INSERT
TO authenticated
WITH CHECK (user_is_admin(auth.uid()));

CREATE POLICY "Admins can update pssr reasons"
ON public.pssr_reasons FOR UPDATE
TO authenticated
USING (user_is_admin(auth.uid()))
WITH CHECK (user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete pssr reasons"
ON public.pssr_reasons FOR DELETE
TO authenticated
USING (user_is_admin(auth.uid()));

-- Also add SELECT for authenticated so they can see all reasons (including drafts) in admin
CREATE POLICY "Admins can view all pssr reasons"
ON public.pssr_reasons FOR SELECT
TO authenticated
USING (user_is_admin(auth.uid()) OR is_active = true);

-- Fix pssr_reason_configuration: Add explicit INSERT/UPDATE/DELETE policies for authenticated admins
CREATE POLICY "Admins can insert reason configurations"
ON public.pssr_reason_configuration FOR INSERT
TO authenticated
WITH CHECK (user_is_admin(auth.uid()));

CREATE POLICY "Admins can update reason configurations"
ON public.pssr_reason_configuration FOR UPDATE
TO authenticated
USING (user_is_admin(auth.uid()))
WITH CHECK (user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete reason configurations"
ON public.pssr_reason_configuration FOR DELETE
TO authenticated
USING (user_is_admin(auth.uid()));

CREATE POLICY "Authenticated users can select reason configurations"
ON public.pssr_reason_configuration FOR SELECT
TO authenticated
USING (true);
