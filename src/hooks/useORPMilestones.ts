import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ORPMilestone {
  id: string;
  orp_plan_id: string;
  name: string;
  description?: string;
  target_date?: string;
  completion_date?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  progress_percentage: number;
  linked_deliverables: string[];
  created_at: string;
  updated_at: string;
}

export const useORPMilestones = (planId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: milestones, isLoading } = useQuery({
    queryKey: ['orp-milestones', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_milestones')
        .select('*')
        .eq('orp_plan_id', planId)
        .order('target_date');

      if (error) throw error;
      return data as ORPMilestone[];
    },
    enabled: !!planId
  });

  const createMilestone = useMutation({
    mutationFn: async (data: Omit<Partial<ORPMilestone>, 'orp_plan_id'>) => {
      const { data: milestone, error } = await supabase
        .from('orp_milestones')
        .insert({
          orp_plan_id: planId,
          name: data.name || 'New Milestone',
          ...data
        })
        .select()
        .single();

      if (error) throw error;
      return milestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-milestones', planId] });
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
    mutationFn: async (data: { id: string; updates: Partial<ORPMilestone> }) => {
      const { error } = await supabase
        .from('orp_milestones')
        .update(data.updates)
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-milestones', planId] });
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
        .from('orp_milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-milestones', planId] });
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
    isCreating: createMilestone.isPending
  };
};
