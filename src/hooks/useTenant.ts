import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
}

/**
 * Hook to get the current user's tenant.
 * The tenant_id is stored on the user's profile and enforced via RLS.
 * All data queries are automatically scoped by Postgres RLS policies —
 * this hook is for UI display purposes (tenant name, logo, etc.).
 */
export const useTenant = () => {
  const { user } = useAuth();

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', user?.id],
    queryFn: async (): Promise<Tenant | null> => {
      if (!user) return null;

      // Get user's tenant_id from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.tenant_id) return null;

      // Fetch tenant details
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single();

      if (tenantError) {
        console.error('Error fetching tenant:', tenantError);
        return null;
      }

      return tenantData as Tenant;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 min — tenant rarely changes
  });

  return {
    tenant,
    tenantId: tenant?.id ?? null,
    tenantName: tenant?.name ?? null,
    isLoading,
    error,
    hasTenant: !!tenant,
  };
};
