import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type PriorityLevel = 'A' | 'B';
export type ActionStatus = 'open' | 'in_progress' | 'closed';

export interface PSSRPriorityAction {
  id: string;
  pssr_id: string;
  item_approval_id: string;
  priority: PriorityLevel;
  description: string;
  action_owner_id: string | null;
  action_owner_name: string | null;
  target_date: string | null;
  status: ActionStatus;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  item_approval?: {
    approver_role: string;
    checklist_response_id: string;
  };
}

export const usePSSRPriorityActions = (pssrId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: actions, isLoading, error } = useQuery({
    queryKey: ['pssr-priority-actions', pssrId],
    queryFn: async () => {
      if (!pssrId) return [];
      
      const { data, error } = await supabase
        .from('pssr_priority_actions')
        .select(`
          *,
          pssr_item_approvals!inner(
            approver_role,
            checklist_response_id
          )
        `)
        .eq('pssr_id', pssrId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as PSSRPriorityAction[];
    },
    enabled: !!pssrId,
  });

  // Create priority action
  const createAction = useMutation({
    mutationFn: async ({ 
      itemApprovalId,
      priority,
      description,
      actionOwnerId,
      actionOwnerName,
      targetDate,
    }: { 
      itemApprovalId: string;
      priority: PriorityLevel;
      description: string;
      actionOwnerId?: string;
      actionOwnerName?: string;
      targetDate?: string;
    }) => {
      if (!pssrId) throw new Error('PSSR ID is required');
      
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('pssr_priority_actions')
        .insert({
          pssr_id: pssrId,
          item_approval_id: itemApprovalId,
          priority,
          description,
          action_owner_id: actionOwnerId || null,
          action_owner_name: actionOwnerName || null,
          target_date: targetDate || null,
          created_by: user.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-priority-actions', pssrId] });
      toast({
        title: 'Action Created',
        description: 'Priority action has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create Action',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update action status
  const updateActionStatus = useMutation({
    mutationFn: async ({ 
      actionId, 
      status 
    }: { 
      actionId: string; 
      status: ActionStatus;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const updateData: any = { status };
      
      if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = user.user?.id;
      }
      
      const { data, error } = await supabase
        .from('pssr_priority_actions')
        .update(updateData)
        .eq('id', actionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-priority-actions', pssrId] });
      toast({
        title: 'Action Updated',
        description: 'Priority action status has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate stats
  const stats = {
    total: actions?.length || 0,
    priorityA: {
      total: actions?.filter(a => a.priority === 'A').length || 0,
      open: actions?.filter(a => a.priority === 'A' && a.status !== 'closed').length || 0,
      closed: actions?.filter(a => a.priority === 'A' && a.status === 'closed').length || 0,
    },
    priorityB: {
      total: actions?.filter(a => a.priority === 'B').length || 0,
      open: actions?.filter(a => a.priority === 'B' && a.status !== 'closed').length || 0,
      closed: actions?.filter(a => a.priority === 'B' && a.status === 'closed').length || 0,
    },
  };

  // Check if all Priority A actions are closed (required for PSSR sign-off)
  const canSignOff = stats.priorityA.open === 0;

  return {
    actions,
    isLoading,
    error,
    createAction,
    updateActionStatus,
    stats,
    canSignOff,
  };
};
