import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface P2AHandoverPlan {
  id: string;
  ora_plan_id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  project_code?: string;
  plant_code?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useP2AHandoverPlan = (oraPlanId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['p2a-handover-plan', oraPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_handover_plans')
        .select('*')
        .eq('ora_plan_id', oraPlanId)
        .maybeSingle();

      if (error) throw error;
      return data as P2AHandoverPlan | null;
    },
    enabled: !!oraPlanId,
  });

  const createPlan = useMutation({
    mutationFn: async (planData: { 
      name: string; 
      description?: string;
      project_code?: string;
      plant_code?: string;
    }) => {
      const { data, error } = await supabase
        .from('p2a_handover_plans')
        .insert({
          ora_plan_id: oraPlanId,
          name: planData.name,
          description: planData.description,
          project_code: planData.project_code,
          plant_code: planData.plant_code,
          created_by: user?.id,
          status: 'DRAFT',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-plan', oraPlanId] });
      toast({
        title: 'Success',
        description: 'P2A Handover Plan created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create plan: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updatePlan = useMutation({
    mutationFn: async (updates: Partial<P2AHandoverPlan>) => {
      if (!plan?.id) throw new Error('No plan to update');
      
      const { data, error } = await supabase
        .from('p2a_handover_plans')
        .update(updates)
        .eq('id', plan.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-plan', oraPlanId] });
      toast({
        title: 'Success',
        description: 'Plan updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update plan: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    plan,
    isLoading,
    error,
    createPlan: createPlan.mutate,
    updatePlan: updatePlan.mutate,
    isCreating: createPlan.isPending,
    isUpdating: updatePlan.isPending,
  };
};
