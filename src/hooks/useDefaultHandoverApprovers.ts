import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface DefaultApprover {
  role_name: string;
  display_order: number;
}

export function useDefaultHandoverApprovers(certificateType: 'PAC' | 'FAC') {
  const queryClient = useQueryClient();

  const { data: approvers, isLoading, error } = useQuery({
    queryKey: ['default-handover-approvers', certificateType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('handover_certificate_templates')
        .select('id, default_signatories')
        .eq('certificate_type', certificateType)
        .eq('is_default', true)
        .single();
      
      if (error) throw error;
      
      // Parse the JSONB data safely
      const signatories = data?.default_signatories;
      if (!signatories || !Array.isArray(signatories)) {
        return { templateId: data?.id, approvers: [] as DefaultApprover[] };
      }
      
      // Safely cast the JSONB array to DefaultApprover[]
      const parsedApprovers = signatories.map((item: Json) => {
        const obj = item as { role_name?: string; display_order?: number };
        return {
          role_name: obj.role_name || '',
          display_order: obj.display_order || 0,
        };
      });
      
      return {
        templateId: data?.id,
        approvers: parsedApprovers
      };
    },
    enabled: !!certificateType,
  });

  const updateApprovers = useMutation({
    mutationFn: async ({ templateId, approvers }: { templateId: string; approvers: DefaultApprover[] }) => {
      // Convert to plain JSON objects for Supabase
      const jsonApprovers = approvers.map(a => ({
        role_name: a.role_name,
        display_order: a.display_order,
      }));
      
      const { error } = await supabase
        .from('handover_certificate_templates')
        .update({ default_signatories: jsonApprovers })
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-handover-approvers', certificateType] });
    },
  });

  return {
    templateId: approvers?.templateId,
    approvers: approvers?.approvers || [],
    isLoading,
    error,
    updateApprovers: updateApprovers.mutate,
    isUpdating: updateApprovers.isPending,
  };
}
