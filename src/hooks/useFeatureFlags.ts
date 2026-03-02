import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if a feature is enabled for the current user's tenant.
 * Usage:
 *   const { isEnabled, isLoading } = useFeatureFlag('ora_module');
 *   if (isEnabled) { ... }
 */
export const useFeatureFlag = (featureKey: string) => {
  const { data: isEnabled = false, isLoading } = useQuery({
    queryKey: ['feature-flag', featureKey],
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_feature_enabled', {
        p_feature_key: featureKey,
      });
      if (error) {
        console.error('Error checking feature flag:', error);
        return true; // Default to enabled if check fails
      }
      return data as boolean;
    },
  });

  return { isEnabled, isLoading };
};

/**
 * Hook to fetch all feature flags for the current user's tenant.
 */
export const useFeatureFlags = () => {
  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['tenant-feature-flags-current'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_feature_flags')
        .select('feature_key, is_enabled')
        .order('feature_key');
      if (error) {
        console.error('Error fetching feature flags:', error);
        return [];
      }
      return data || [];
    },
  });

  const isEnabled = (key: string): boolean => {
    const flag = flags.find(f => f.feature_key === key);
    return flag ? flag.is_enabled : true; // Default to enabled if not configured
  };

  return { flags, isEnabled, isLoading };
};
