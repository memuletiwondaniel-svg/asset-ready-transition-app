import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TenantSSOConfig {
  id: string;
  tenant_id: string;
  provider_type: 'saml' | 'oidc';
  idp_entity_id: string | null;
  idp_sso_url: string | null;
  idp_metadata_url: string | null;
  idp_certificate: string | null;
  supabase_sso_provider_id: string | null;
  display_name: string;
  button_label: string | null;
  is_active: boolean;
  is_configured: boolean;
  configured_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for reading active SSO config for a tenant (used on login page).
 * Works for both anon and authenticated users.
 */
export const useTenantSSOConfigPublic = (tenantId: string | null) => {
  const { data: ssoConfig, isLoading } = useQuery({
    queryKey: ['tenant-sso-config-public', tenantId],
    queryFn: async (): Promise<TenantSSOConfig | null> => {
      if (!tenantId) return null;
      const { data, error } = await (supabase as any)
        .from('tenant_sso_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('is_configured', true)
        .maybeSingle();
      if (error) {
        console.error('Error fetching SSO config:', error);
        return null;
      }
      return data as TenantSSOConfig | null;
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 30,
  });

  return { ssoConfig, isLoading };
};

/**
 * Hook for admin management of SSO configs.
 */
export const useTenantSSOConfigAdmin = (tenantId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ssoConfig, isLoading } = useQuery({
    queryKey: ['tenant-sso-config-admin', tenantId],
    queryFn: async (): Promise<TenantSSOConfig | null> => {
      if (!tenantId) return null;
      const { data, error } = await (supabase as any)
        .from('tenant_sso_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching SSO config:', error);
        return null;
      }
      return data as TenantSSOConfig | null;
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5,
  });

  const upsertMutation = useMutation({
    mutationFn: async (config: Partial<TenantSSOConfig> & { tenant_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        ...config,
        configured_by: user?.id,
        is_configured: !!(config.idp_entity_id && config.idp_sso_url),
      };

      const { data, error } = await (supabase as any)
        .from('tenant_sso_configs')
        .upsert(payload, { onConflict: 'tenant_id,provider_type' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-sso-config-admin', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-sso-config-public', tenantId] });
      toast({ title: 'Success', description: 'SSO configuration saved' });
    },
    onError: (error: any) => {
      console.error('Error saving SSO config:', error);
      toast({ title: 'Error', description: 'Failed to save SSO configuration', variant: 'destructive' });
    },
  });

  return {
    ssoConfig,
    isLoading,
    saveSSOConfig: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
  };
};
