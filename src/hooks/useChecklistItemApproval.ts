import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ApprovalStatus = 'pending' | 'approved' | 'approved_with_condition' | 'rejected';

export interface ChecklistItemApprovalResponse {
  id: string;
  pssr_id: string;
  checklist_item_id: string;
  discipline_id: string;
  approver_user_id: string | null;
  status: ApprovalStatus;
  comments: string | null;
  condition_description: string | null;
  condition_target_date: string | null;
  condition_priority: 'P1' | 'P2' | 'P3' | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalResponseWithDetails extends ChecklistItemApprovalResponse {
  discipline?: {
    id: string;
    name: string;
  };
  approver?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export const useChecklistItemApprovals = (pssrId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: approvals = [], isLoading, error, refetch } = useQuery({
    queryKey: ['checklist-item-approvals', pssrId],
    queryFn: async () => {
      if (!pssrId) return [];

      const { data, error } = await supabase
        .from('checklist_item_approval_responses')
        .select(`
          *,
          discipline:discipline_id (
            id,
            name
          )
        `)
        .eq('pssr_id', pssrId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ApprovalResponseWithDetails[];
    },
    enabled: !!pssrId,
  });

  // Get approval status for a specific item and discipline
  const getApprovalStatus = (checklistItemId: string, disciplineId: string) => {
    return approvals.find(
      a => a.checklist_item_id === checklistItemId && a.discipline_id === disciplineId
    );
  };

  // Get all approvals for a specific checklist item
  const getApprovalsForItem = (checklistItemId: string) => {
    return approvals.filter(a => a.checklist_item_id === checklistItemId);
  };

  // Get all pending approvals for the current user's discipline
  const getPendingApprovalsForDiscipline = (disciplineId: string) => {
    return approvals.filter(
      a => a.discipline_id === disciplineId && a.status === 'pending'
    );
  };

  // Submit an approval
  const submitApproval = useMutation({
    mutationFn: async ({
      pssrId,
      checklistItemId,
      disciplineId,
      status,
      comments,
      conditionDescription,
      conditionTargetDate,
      conditionPriority,
    }: {
      pssrId: string;
      checklistItemId: string;
      disciplineId: string;
      status: ApprovalStatus;
      comments?: string;
      conditionDescription?: string;
      conditionTargetDate?: string;
      conditionPriority?: 'P1' | 'P2' | 'P3';
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;

      // Check if an approval record already exists
      const { data: existing } = await supabase
        .from('checklist_item_approval_responses')
        .select('id')
        .eq('pssr_id', pssrId)
        .eq('checklist_item_id', checklistItemId)
        .eq('discipline_id', disciplineId)
        .maybeSingle();

      const approvalData = {
        pssr_id: pssrId,
        checklist_item_id: checklistItemId,
        discipline_id: disciplineId,
        approver_user_id: userId,
        status,
        comments: comments || null,
        condition_description: status === 'approved_with_condition' ? conditionDescription : null,
        condition_target_date: status === 'approved_with_condition' ? conditionTargetDate : null,
        condition_priority: status === 'approved_with_condition' ? conditionPriority : null,
        approved_at: ['approved', 'approved_with_condition'].includes(status) ? new Date().toISOString() : null,
        rejected_at: status === 'rejected' ? new Date().toISOString() : null,
      };

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('checklist_item_approval_responses')
          .update(approvalData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('checklist_item_approval_responses')
          .insert(approvalData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-item-approvals', variables.pssrId] });
      
      const statusMessages: Record<ApprovalStatus, string> = {
        approved: 'Item approved successfully',
        approved_with_condition: 'Item approved with condition',
        rejected: 'Item rejected - delivering party notified',
        pending: 'Approval reset to pending',
      };
      
      toast.success(statusMessages[variables.status]);
    },
    onError: (error: any) => {
      console.error('Error submitting approval:', error);
      toast.error(error.message || 'Failed to submit approval');
    },
  });

  // Calculate stats for a PSSR
  const stats = {
    total: approvals.length,
    approved: approvals.filter(a => a.status === 'approved').length,
    approvedWithCondition: approvals.filter(a => a.status === 'approved_with_condition').length,
    rejected: approvals.filter(a => a.status === 'rejected').length,
    pending: approvals.filter(a => a.status === 'pending').length,
  };

  return {
    approvals,
    isLoading,
    error,
    refetch,
    getApprovalStatus,
    getApprovalsForItem,
    getPendingApprovalsForDiscipline,
    submitApproval,
    stats,
  };
};

// Hook to get approvals for the current user based on their discipline
export const useUserPendingApprovals = () => {
  const { data: pendingApprovals = [], isLoading } = useQuery({
    queryKey: ['user-pending-approvals'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) return [];

      // Get user's profile to find their discipline
      const { data: profile } = await supabase
        .from('profiles')
        .select('discipline')
        .eq('user_id', session.session.user.id)
        .single();

      if (!profile?.discipline) return [];

      // Get all pending approvals for items assigned to user's discipline
      const { data, error } = await supabase
        .from('checklist_item_approval_responses')
        .select(`
          *,
          discipline:discipline_id (
            id,
            name
          )
        `)
        .eq('discipline_id', profile.discipline)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ApprovalResponseWithDetails[];
    },
  });

  return { pendingApprovals, isLoading };
};
