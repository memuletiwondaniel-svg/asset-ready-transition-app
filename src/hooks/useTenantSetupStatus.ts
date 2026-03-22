import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';

/**
 * Checks whether the current tenant has completed setup.
 * Uses the tenant's `settings` JSON column: { setup_completed: true }
 */
export function useTenantSetupStatus() {
  const { tenant, tenantId, isLoading: tenantLoading } = useTenant();

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-setup-status', tenantId],
    queryFn: async () => {
      if (!tenantId) return { needsSetup: false, counts: null };

      // Check whether key config tables have data for this tenant
      const [plants, hubs, roles] = await Promise.all([
        supabase.from('plant').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('hubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('roles').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const counts = {
        plants: plants.count ?? 0,
        hubs: hubs.count ?? 0,
        roles: roles.count ?? 0,
      };

      const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
      const setupCompleted = settings.setup_completed === true;

      // Needs setup if explicitly not completed AND tables are empty
      const needsSetup = !setupCompleted && counts.plants === 0 && counts.hubs === 0;

      return { needsSetup, counts };
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 1000 * 60 * 10,
  });

  return {
    needsSetup: data?.needsSetup ?? false,
    counts: data?.counts ?? null,
    isLoading: isLoading || tenantLoading,
  };
}
