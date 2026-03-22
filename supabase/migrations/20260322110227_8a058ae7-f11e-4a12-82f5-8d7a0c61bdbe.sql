-- Fix security definer view warning: ensure profiles_safe uses invoker security
-- This makes the view respect the querying user's RLS policies, not the view creator's
ALTER VIEW public.profiles_safe SET (security_invoker = on);