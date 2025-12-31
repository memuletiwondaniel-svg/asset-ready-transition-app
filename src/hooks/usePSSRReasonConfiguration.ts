import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PSSRReasonConfiguration {
  id: string;
  reason_id: string;
  pssr_approver_role_ids: string[];
  sof_approver_role_ids: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined data
  reason_name?: string;
}

export interface ConfigurationWithDetails extends PSSRReasonConfiguration {
  reason: {
    id: string;
    name: string;
    is_active: boolean;
    display_order: number;
  } | null;
  pssr_approver_roles: Array<{ id: string; name: string }>;
  sof_approver_roles: Array<{ id: string; name: string }>;
}

// Fetch all configurations with joined data
export const usePSSRReasonConfigurations = () => {
  return useQuery({
    queryKey: ['pssr-reason-configurations'],
    queryFn: async () => {
      // First get all configurations
      const { data: configs, error: configError } = await supabase
        .from('pssr_reason_configuration')
        .select('*')
        .order('created_at');

      if (configError) throw configError;

      // Get all reasons for joining
      const { data: reasons, error: reasonsError } = await supabase
        .from('pssr_reasons')
        .select('id, name, is_active, display_order')
        .order('display_order');

      if (reasonsError) throw reasonsError;

      // Get all roles for joining
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      // Build configurations with all joined data
      // Also include reasons that don't have configurations yet
      const configMap = new Map(configs?.map(c => [c.reason_id, c]) || []);
      
      const result: ConfigurationWithDetails[] = (reasons || []).map(reason => {
        const config = configMap.get(reason.id);
        
        const pssrApproverRoleIds = config?.pssr_approver_role_ids || [];
        const sofApproverRoleIds = config?.sof_approver_role_ids || [];

        return {
          id: config?.id || '',
          reason_id: reason.id,
          pssr_approver_role_ids: pssrApproverRoleIds,
          sof_approver_role_ids: sofApproverRoleIds,
          created_at: config?.created_at || '',
          updated_at: config?.updated_at || '',
          created_by: config?.created_by || null,
          updated_by: config?.updated_by || null,
          reason: reason,
          pssr_approver_roles: (roles || []).filter(r => pssrApproverRoleIds.includes(r.id)),
          sof_approver_roles: (roles || []).filter(r => sofApproverRoleIds.includes(r.id)),
        };
      });

      return result;
    },
  });
};

// Fetch configuration for a specific reason
export const usePSSRReasonConfigurationByReason = (reasonId: string | null) => {
  return useQuery({
    queryKey: ['pssr-reason-configuration', reasonId],
    queryFn: async () => {
      if (!reasonId) return null;

      const { data, error } = await supabase
        .from('pssr_reason_configuration')
        .select('*')
        .eq('reason_id', reasonId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data as PSSRReasonConfiguration | null;
    },
    enabled: !!reasonId,
  });
};

// Upsert configuration (create or update)
export const useUpsertPSSRReasonConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (configs: Array<{
      reason_id: string;
      pssr_approver_role_ids: string[];
      sof_approver_role_ids: string[];
    }>) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      // Process each configuration
      for (const config of configs) {
        // Check if configuration exists for this reason
        const { data: existing } = await supabase
          .from('pssr_reason_configuration')
          .select('id')
          .eq('reason_id', config.reason_id)
          .single();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('pssr_reason_configuration')
            .update({
              pssr_approver_role_ids: config.pssr_approver_role_ids,
              sof_approver_role_ids: config.sof_approver_role_ids,
              updated_by: userId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Create new
          const { error } = await supabase
            .from('pssr_reason_configuration')
            .insert({
              reason_id: config.reason_id,
              pssr_approver_role_ids: config.pssr_approver_role_ids,
              sof_approver_role_ids: config.sof_approver_role_ids,
              created_by: userId,
              updated_by: userId,
            });

          if (error) throw error;
        }
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configuration'] });
      toast.success('Configuration saved successfully');
    },
    onError: (error) => {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    },
  });
};

// Get configuration for PSSR creation (by reason name)
export const usePSSRConfigurationByReasonName = (reasonName: string | null) => {
  return useQuery({
    queryKey: ['pssr-configuration-by-name', reasonName],
    queryFn: async () => {
      if (!reasonName) return null;

      // First get the reason by name
      const { data: reason, error: reasonError } = await supabase
        .from('pssr_reasons')
        .select('id')
        .eq('name', reasonName)
        .eq('is_active', true)
        .single();

      if (reasonError || !reason) return null;

      // Get configuration for this reason
      const { data: config, error: configError } = await supabase
        .from('pssr_reason_configuration')
        .select('*')
        .eq('reason_id', reason.id)
        .single();

      if (configError && configError.code !== 'PGRST116') throw configError;
      if (!config) return null;

      // Get roles details
      const { data: roles } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true);

      const pssrApproverRoles = (roles || []).filter(r => 
        (config.pssr_approver_role_ids || []).includes(r.id)
      );
      const sofApproverRoles = (roles || []).filter(r => 
        (config.sof_approver_role_ids || []).includes(r.id)
      );

      return {
        ...config,
        pssrApproverRoles,
        sofApproverRoles,
      };
    },
    enabled: !!reasonName,
  });
};
