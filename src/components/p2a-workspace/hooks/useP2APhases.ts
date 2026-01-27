import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface P2AMilestone {
  id: string;
  handover_plan_id: string;
  name: string;
  code?: string;
  target_date?: string;
  actual_date?: string;
  display_order: number;
  source: 'MANUAL' | 'PRIMAVERA_API';
  external_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface P2APhase {
  id: string;
  handover_plan_id: string;
  name: string;
  description?: string;
  start_milestone_id?: string;
  end_milestone_id?: string;
  display_order: number;
  color: string;
  created_at: string;
  updated_at: string;
  // Joined data
  start_milestone?: P2AMilestone;
  end_milestone?: P2AMilestone;
}

export const useP2AMilestones = (handoverPlanId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: milestones, isLoading } = useQuery({
    queryKey: ['p2a-milestones', handoverPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_project_milestones')
        .select('*')
        .eq('handover_plan_id', handoverPlanId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as P2AMilestone[];
    },
    enabled: !!handoverPlanId,
  });

  const addMilestone = useMutation({
    mutationFn: async (data: Omit<P2AMilestone, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('p2a_project_milestones')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-milestones', handoverPlanId] });
      toast({ title: 'Success', description: 'Milestone added' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const addMilestonesBulk = useMutation({
    mutationFn: async (data: Array<Omit<P2AMilestone, 'id' | 'created_at' | 'updated_at'>>) => {
      const { data: result, error } = await supabase
        .from('p2a_project_milestones')
        .insert(data)
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['p2a-milestones', handoverPlanId] });
      toast({ title: 'Success', description: `${data.length} milestones imported` });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<P2AMilestone> }) => {
      const { data, error } = await supabase
        .from('p2a_project_milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-milestones', handoverPlanId] });
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('p2a_project_milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-milestones', handoverPlanId] });
      toast({ title: 'Success', description: 'Milestone deleted' });
    },
  });

  return {
    milestones: milestones || [],
    isLoading,
    addMilestone: addMilestone.mutate,
    addMilestonesBulk: addMilestonesBulk.mutate,
    updateMilestone: updateMilestone.mutate,
    deleteMilestone: deleteMilestone.mutate,
    isAdding: addMilestone.isPending,
  };
};

export const useP2APhases = (handoverPlanId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: phases, isLoading } = useQuery({
    queryKey: ['p2a-phases', handoverPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_project_phases')
        .select(`
          *,
          start_milestone:p2a_project_milestones!p2a_project_phases_start_milestone_id_fkey(*),
          end_milestone:p2a_project_milestones!p2a_project_phases_end_milestone_id_fkey(*)
        `)
        .eq('handover_plan_id', handoverPlanId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as P2APhase[];
    },
    enabled: !!handoverPlanId,
  });

  const addPhase = useMutation({
    mutationFn: async (data: Omit<P2APhase, 'id' | 'created_at' | 'updated_at' | 'start_milestone' | 'end_milestone'>) => {
      const { data: result, error } = await supabase
        .from('p2a_project_phases')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-phases', handoverPlanId] });
      toast({ title: 'Success', description: 'Phase created' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updatePhase = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<P2APhase> }) => {
      const { data, error } = await supabase
        .from('p2a_project_phases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-phases', handoverPlanId] });
    },
  });

  const deletePhase = useMutation({
    mutationFn: async (id: string) => {
      // First, move all VCRs in this phase to unassigned (phase_id = null)
      const { error: updateError } = await supabase
        .from('p2a_handover_points')
        .update({ phase_id: null })
        .eq('phase_id', id);

      if (updateError) throw updateError;

      // Then delete the phase
      const { error: deleteError } = await supabase
        .from('p2a_project_phases')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-phases', handoverPlanId] });
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
      toast({ title: 'Success', description: 'Phase deleted. VCRs moved to Unassigned.' });
    },
  });

  const reorderPhases = useMutation({
    mutationFn: async (reorderedPhases: { id: string; display_order: number }[]) => {
      // Update all phases with their new display_order
      const updates = reorderedPhases.map(({ id, display_order }) =>
        supabase
          .from('p2a_project_phases')
          .update({ display_order })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onMutate: async (reorderedPhases) => {
      // Optimistically update cache so the UI doesn't snap back after dropping
      await queryClient.cancelQueries({ queryKey: ['p2a-phases', handoverPlanId] });

      const previous = queryClient.getQueryData<P2APhase[]>(['p2a-phases', handoverPlanId]);

      queryClient.setQueryData<P2APhase[]>(['p2a-phases', handoverPlanId], (current) => {
        const phasesList = current ?? [];
        const orderMap = new Map(reorderedPhases.map((p) => [p.id, p.display_order] as const));

        const next = phasesList
          .map((p) => {
            const nextOrder = orderMap.get(p.id);
            return nextOrder === undefined ? p : { ...p, display_order: nextOrder };
          })
          .sort((a, b) => a.display_order - b.display_order);

        return next;
      });

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-phases', handoverPlanId] });
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['p2a-phases', handoverPlanId], context.previous);
      }
      toast({ title: 'Error', description: 'Failed to reorder phases', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-phases', handoverPlanId] });
    },
  });

  return {
    phases: phases || [],
    isLoading,
    addPhase: addPhase.mutate,
    updatePhase: updatePhase.mutate,
    deletePhase: deletePhase.mutate,
    reorderPhases: reorderPhases.mutate,
    isAdding: addPhase.isPending,
  };
};
