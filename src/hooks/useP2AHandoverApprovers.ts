import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export type ApproverStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface P2AHandoverApprover {
  id: string;
  handover_id: string;
  user_id: string | null;
  role_name: string;
  display_order: number;
  status: ApproverStatus;
  approved_at: string | null;
  comments: string | null;
  created_at: string;
  // Joined profile data
  user?: {
    full_name: string;
    email: string;
  };
}

const DEFAULT_APPROVERS = [
  { role_name: 'Project Team Lead', display_order: 1 },
  { role_name: 'Asset Team Lead', display_order: 2 },
  { role_name: 'Operations Manager', display_order: 3 },
  { role_name: 'Plant Director', display_order: 4 },
];

export function useP2AHandoverApprovers(handoverId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch approvers for a handover
  const { data: approvers, isLoading, error } = useQuery({
    queryKey: ['p2a-handover-approvers', handoverId],
    queryFn: async () => {
      if (!handoverId) return [];
      
      const { data, error } = await supabase
        .from('p2a_handover_approvers')
        .select('*')
        .eq('handover_id', handoverId)
        .order('display_order');

      if (error) throw error;
      
      // Fetch user profiles separately if needed
      const approversWithProfiles = await Promise.all(
        data.map(async (approver) => {
          if (approver.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', approver.user_id)
              .single();
            return { ...approver, user: profile || undefined };
          }
          return { ...approver, user: undefined };
        })
      );
      
      return approversWithProfiles as P2AHandoverApprover[];
    },
    enabled: !!handoverId
  });

  // Initialize with default approvers
  const initializeApprovers = useMutation({
    mutationFn: async (handoverId: string) => {
      const records = DEFAULT_APPROVERS.map(approver => ({
        handover_id: handoverId,
        role_name: approver.role_name,
        display_order: approver.display_order,
        status: 'PENDING' as ApproverStatus,
      }));

      const { data, error } = await supabase
        .from('p2a_handover_approvers')
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-approvers', handoverId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Add a new approver
  const addApprover = useMutation({
    mutationFn: async ({ handoverId, roleName, userId, displayOrder }: {
      handoverId: string;
      roleName: string;
      userId?: string;
      displayOrder: number;
    }) => {
      const { data, error } = await supabase
        .from('p2a_handover_approvers')
        .insert({
          handover_id: handoverId,
          role_name: roleName,
          user_id: userId || null,
          display_order: displayOrder,
          status: 'PENDING' as ApproverStatus,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-approvers', handoverId] });
      toast({ title: 'Success', description: 'Approver added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update an approver
  const updateApprover = useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: Partial<Pick<P2AHandoverApprover, 'role_name' | 'user_id' | 'display_order'>> 
    }) => {
      const { data, error } = await supabase
        .from('p2a_handover_approvers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-approvers', handoverId] });
      toast({ title: 'Success', description: 'Approver updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete an approver
  const deleteApprover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('p2a_handover_approvers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-approvers', handoverId] });
      toast({ title: 'Success', description: 'Approver removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Reorder approvers
  const reorderApprovers = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('p2a_handover_approvers')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-approvers', handoverId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    approvers,
    isLoading,
    error,
    initializeApprovers: initializeApprovers.mutateAsync,
    addApprover: addApprover.mutate,
    updateApprover: updateApprover.mutate,
    deleteApprover: deleteApprover.mutate,
    reorderApprovers: reorderApprovers.mutate,
    isInitializing: initializeApprovers.isPending,
    isAdding: addApprover.isPending,
    isUpdating: updateApprover.isPending,
    isDeleting: deleteApprover.isPending,
  };
}
