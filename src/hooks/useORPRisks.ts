import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ORPRisk {
  id: string;
  orp_plan_id: string;
  title: string;
  description?: string;
  category: 'TECHNICAL' | 'SCHEDULE' | 'RESOURCE' | 'BUDGET' | 'SAFETY' | 'QUALITY' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'MONITORING' | 'MITIGATED' | 'CLOSED';
  mitigation_plan?: string;
  owner_user_id?: string;
  identified_date: string;
  target_resolution_date?: string;
  actual_resolution_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useORPRisks = (planId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: risks, isLoading } = useQuery({
    queryKey: ['orp-risks', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_risks')
        .select(`
          *,
          owner:profiles!orp_risks_owner_user_id_fkey(full_name)
        `)
        .eq('orp_plan_id', planId)
        .order('severity', { ascending: false })
        .order('probability', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!planId
  });

  const createRisk = useMutation({
    mutationFn: async (data: Omit<Partial<ORPRisk>, 'orp_plan_id' | 'created_by'>) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: risk, error } = await supabase
        .from('orp_risks')
        .insert({
          orp_plan_id: planId,
          created_by: user.user.id,
          title: data.title || 'New Risk',
          category: data.category || 'OTHER',
          severity: data.severity || 'MEDIUM',
          probability: data.probability || 'MEDIUM',
          ...data
        })
        .select()
        .single();

      if (error) throw error;
      return risk;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-risks', planId] });
      toast({
        title: 'Success',
        description: 'Risk created successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateRisk = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<ORPRisk> }) => {
      const { error } = await supabase
        .from('orp_risks')
        .update(data.updates)
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-risks', planId] });
      toast({
        title: 'Success',
        description: 'Risk updated successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteRisk = useMutation({
    mutationFn: async (riskId: string) => {
      const { error } = await supabase
        .from('orp_risks')
        .delete()
        .eq('id', riskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-risks', planId] });
      toast({
        title: 'Success',
        description: 'Risk deleted successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    risks,
    isLoading,
    createRisk: createRisk.mutate,
    updateRisk: updateRisk.mutate,
    deleteRisk: deleteRisk.mutate,
    isCreating: createRisk.isPending
  };
};
