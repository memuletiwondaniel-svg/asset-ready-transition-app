import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { getTenantSlugFromHostname } from '@/lib/tenant-resolver';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
}

interface TenantContextType {
  /** Tenant resolved from subdomain (available before login) */
  subdomainTenant: Tenant | null;
  /** Tenant from the logged-in user's profile */
  userTenant: Tenant | null;
  /** The active tenant (user's tenant takes priority) */
  tenant: Tenant | null;
  /** Whether subdomain and user tenant match (null if no user yet) */
  tenantMismatch: boolean | null;
  /** The subdomain slug detected from the URL */
  subdomainSlug: string | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  subdomainTenant: null,
  userTenant: null,
  tenant: null,
  tenantMismatch: null,
  subdomainSlug: null,
  isLoading: true,
});

export const useTenantContext = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subdomainSlug] = useState(() => getTenantSlugFromHostname());

  // Resolve tenant from subdomain (works before login — no RLS needed)
  const { data: subdomainTenant, isLoading: subdomainLoading } = useQuery({
    queryKey: ['tenant-by-slug', subdomainSlug],
    queryFn: async (): Promise<Tenant | null> => {
      if (!subdomainSlug) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', subdomainSlug)
        .eq('is_active', true)
        .maybeSingle();
      if (error) {
        console.error('Tenant resolution error:', error);
        return null;
      }
      return data as Tenant | null;
    },
    enabled: !!subdomainSlug,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Resolve tenant from logged-in user's profile
  const { data: userTenant, isLoading: userTenantLoading } = useQuery({
    queryKey: ['user-tenant', user?.id],
    queryFn: async (): Promise<Tenant | null> => {
      if (!user) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      if (!profile?.tenant_id) return null;

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single();
      return tenantData as Tenant | null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30,
  });

  // Determine mismatch
  const tenantMismatch = user && subdomainTenant && userTenant
    ? subdomainTenant.id !== userTenant.id
    : null;

  const tenant = userTenant ?? subdomainTenant ?? null;
  const isLoading = (!!subdomainSlug && subdomainLoading) || (!!user && userTenantLoading);

  return (
    <TenantContext.Provider value={{
      subdomainTenant,
      userTenant,
      tenant,
      tenantMismatch,
      subdomainSlug,
      isLoading,
    }}>
      {children}
    </TenantContext.Provider>
  );
};
