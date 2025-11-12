import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useORMMilestones = (planId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: milestones, isLoading } = useQuery({
    queryKey: ['orm-milestones', planId],
    queryFn: async () => {
      let query = supabase
        .from('orm_milestones')
        .select('*')
        .order('target_date', { ascending: true });

      if (planId) {
        query = query.eq('orm_plan_id', planId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: planId !== undefined
  });

  const createMilestone = useMutation({
    mutationFn: async (data: {
      orm_plan_id: string;
      name: string;
      description?: string;
      target_date?: string;
      linked_deliverables?: string[];
    }) => {
      const { error } = await supabase
        .from('orm_milestones')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-milestones'] });
      toast({
        title: 'Success',
        description: 'Milestone created successfully'
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

  const updateMilestone = useMutation({
    mutationFn: async (data: {
      milestoneId: string;
      updates: {
        name?: string;
        description?: string;
        target_date?: string;
        status?: string;
        linked_deliverables?: string[];
      };
    }) => {
      const { error } = await supabase
        .from('orm_milestones')
        .update(data.updates)
        .eq('id', data.milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-milestones'] });
      toast({
        title: 'Success',
        description: 'Milestone updated successfully'
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

  const deleteMilestone = useMutation({
    mutationFn: async (milestoneId: string) => {
      const { error } = await supabase
        .from('orm_milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-milestones'] });
      toast({
        title: 'Success',
        description: 'Milestone deleted successfully'
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
    milestones,
    isLoading,
    createMilestone: createMilestone.mutate,
    updateMilestone: updateMilestone.mutate,
    deleteMilestone: deleteMilestone.mutate,
    isCreating: createMilestone.isPending,
    isUpdating: updateMilestone.isPending
  };
};
