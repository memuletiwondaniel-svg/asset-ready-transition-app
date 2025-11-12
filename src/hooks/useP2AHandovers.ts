import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface P2AHandover {
  id: string;
  project_id: string;
  phase: 'PAC' | 'FAC';
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  handover_scope?: string;
  pssr_signed_date?: string;
  pac_effective_date?: string;
  fac_effective_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  project?: {
    project_title: string;
    project_id_prefix: string;
    project_id_number: string;
  };
}

export interface P2ADeliverableCategory {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export interface P2AHandoverDeliverable {
  id: string;
  handover_id: string;
  category_id: string;
  deliverable_name: string;
  delivering_party: string;
  receiving_party: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'BEHIND_SCHEDULE' | 'COMPLETED' | 'NOT_APPLICABLE';
  completion_date?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
  category?: P2ADeliverableCategory;
}

export const useP2AHandovers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: handovers, isLoading, error } = useQuery({
    queryKey: ['p2a-handovers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_handovers')
        .select(`
          *,
          project:projects(
            project_title,
            project_id_prefix,
            project_id_number
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as P2AHandover[];
    }
  });

  const createHandover = useMutation({
    mutationFn: async (handoverData: Omit<P2AHandover, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('p2a_handovers')
        .insert({ ...handoverData, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handovers'] });
      toast({
        title: 'Success',
        description: 'P2A handover created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create handover: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const updateHandover = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<P2AHandover> }) => {
      const { data, error } = await supabase
        .from('p2a_handovers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handovers'] });
      toast({
        title: 'Success',
        description: 'P2A handover updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update handover: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  return {
    handovers,
    isLoading,
    error,
    createHandover: createHandover.mutate,
    updateHandover: updateHandover.mutate,
    isCreating: createHandover.isPending,
    isUpdating: updateHandover.isPending,
  };
};

export const useP2ADeliverableCategories = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['p2a-deliverable-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_deliverable_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as P2ADeliverableCategory[];
    }
  });

  return { categories, isLoading };
};

export const useP2AHandoverDeliverables = (handoverId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deliverables, isLoading } = useQuery({
    queryKey: ['p2a-handover-deliverables', handoverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_handover_deliverables')
        .select(`
          *,
          category:p2a_deliverable_categories(*)
        `)
        .eq('handover_id', handoverId)
        .order('created_at');

      if (error) throw error;
      return data as P2AHandoverDeliverable[];
    },
    enabled: !!handoverId
  });

  const addDeliverable = useMutation({
    mutationFn: async (deliverableData: Omit<P2AHandoverDeliverable, 'id' | 'created_at' | 'updated_at' | 'category'>) => {
      const { data, error } = await supabase
        .from('p2a_handover_deliverables')
        .insert(deliverableData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-deliverables', handoverId] });
      toast({
        title: 'Success',
        description: 'Deliverable added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add deliverable: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const updateDeliverable = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<P2AHandoverDeliverable> }) => {
      const { data, error } = await supabase
        .from('p2a_handover_deliverables')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-deliverables', handoverId] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update deliverable: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  return {
    deliverables,
    isLoading,
    addDeliverable: addDeliverable.mutate,
    updateDeliverable: updateDeliverable.mutate,
    isAdding: addDeliverable.isPending,
    isUpdating: updateDeliverable.isPending,
  };
};