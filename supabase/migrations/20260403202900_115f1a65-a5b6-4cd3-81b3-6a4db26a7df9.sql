
-- Fix overly permissive INSERT policy on rlmu_reviews
DROP POLICY IF EXISTS "Service role can insert RLMU reviews" ON public.rlmu_reviews;

CREATE POLICY "Authenticated users can insert RLMU reviews"
  ON public.rlmu_reviews FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);
