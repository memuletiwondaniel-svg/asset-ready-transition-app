import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type ItemApprovalStatus = 'pending' | 'ready_for_review' | 'approved' | 'rejected' | 'approved_with_action';

export interface PSSRItemApproval {
  id: string;
  pssr_id: string;
  checklist_response_id: string;
  approver_role: string;
  approver_user_id: string | null;
  status: ItemApprovalStatus;
  comments: string | null;
  reviewed_at: string | null;
  notified_at: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  checklist_response?: {
    id: string;
    response: string;
    narrative: string | null;
    checklist_item_id: string;
    checklist_item?: {
      unique_id: string;
      question: string;
      category: string;
      topic: string | null;
    };
  };
}

export interface DisciplineReview {
  id: string;
  pssr_id: string;
  discipline_role: string;
  reviewer_user_id: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  discipline_comment: string | null;
  items_total: number;
  items_reviewed: number;
  completed_at: string | null;
  created_at: string;
}

// Fetch item approvals for a specific PSSR and role
export const usePSSRItemApprovals = (pssrId: string | undefined, approverRole?: string) => {
  const queryClient = useQueryClient();

  const { data: approvals, isLoading, error } = useQuery({
    queryKey: ['pssr-item-approvals', pssrId, approverRole],
    queryFn: async () => {
      if (!pssrId) return [];
      
      let query = supabase
        .from('pssr_item_approvals')
        .select(`
          *,
          pssr_checklist_responses!inner(
            id,
            response,
            narrative,
            checklist_item_id
          )
        `)
        .eq('pssr_id', pssrId);
      
      if (approverRole) {
        query = query.eq('approver_role', approverRole);
      }
      
      const { data, error } = await query.order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as PSSRItemApproval[];
    },
    enabled: !!pssrId,
  });

  // Get discipline review status
  const { data: disciplineReview } = useQuery({
    queryKey: ['pssr-discipline-review', pssrId, approverRole],
    queryFn: async () => {
      if (!pssrId || !approverRole) return null;
      
      const { data, error } = await supabase
        .from('pssr_discipline_reviews')
        .select('*')
        .eq('pssr_id', pssrId)
        .eq('discipline_role', approverRole)
        .maybeSingle();
      
      if (error) throw error;
      return data as DisciplineReview | null;
    },
    enabled: !!pssrId && !!approverRole,
  });

  // Update approval status
  const updateApproval = useMutation({
    mutationFn: async ({ 
      approvalId, 
      status, 
      comments 
    }: { 
      approvalId: string; 
      status: ItemApprovalStatus; 
      comments?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('pssr_item_approvals')
        .update({
          status,
          comments: comments || null,
          reviewed_at: new Date().toISOString(),
          approver_user_id: user.user?.id,
        })
        .eq('id', approvalId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-item-approvals', pssrId] });
      queryClient.invalidateQueries({ queryKey: ['pssr-discipline-review', pssrId] });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Complete discipline review
  const completeDisciplineReview = useMutation({
    mutationFn: async ({ disciplineComment }: { disciplineComment?: string }) => {
      if (!pssrId || !approverRole) throw new Error('Missing PSSR ID or approver role');
      
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('pssr_discipline_reviews')
        .upsert({
          pssr_id: pssrId,
          discipline_role: approverRole,
          reviewer_user_id: user.user?.id,
          status: 'completed',
          discipline_comment: disciplineComment || null,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'pssr_id,discipline_role'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-discipline-review', pssrId] });
      toast({
        title: 'Review Complete',
        description: 'Your discipline review has been successfully completed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Completion Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate stats
  const stats = {
    total: approvals?.length || 0,
    pending: approvals?.filter(a => a.status === 'pending').length || 0,
    readyForReview: approvals?.filter(a => a.status === 'ready_for_review').length || 0,
    approved: approvals?.filter(a => a.status === 'approved' || a.status === 'approved_with_action').length || 0,
    rejected: approvals?.filter(a => a.status === 'rejected').length || 0,
  };

  const progress = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  return {
    approvals,
    disciplineReview,
    isLoading,
    error,
    updateApproval,
    completeDisciplineReview,
    stats,
    progress,
  };
};

// Fetch all PSSRs pending approval for a user
export const usePSSRsAwaitingReview = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['pssrs-awaiting-review', userId],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!userId) return [];

      // Fetch all item approvals assigned to this user - removed station column (doesn't exist)
      const { data: approvals, error } = await supabase
        .from('pssr_item_approvals')
        .select(`
          id,
          pssr_id,
          approver_role,
          status,
          assigned_at,
          pssrs!inner(
            id,
            pssr_id,
            project_name,
            asset,
            scope,
            cs_location,
            created_at
          )
        `)
        .eq('approver_user_id', userId)
        .in('status', ['ready_for_review', 'pending']);

      if (error) throw error;

      // Group by PSSR
      const pssrMap = new Map<string, {
        pssr: any;
        approverRole: string;
        itemCount: number;
        pendingSince: string;
      }>();

      for (const approval of approvals || []) {
        const pssrId = approval.pssr_id;
        if (!pssrMap.has(pssrId)) {
          pssrMap.set(pssrId, {
            pssr: approval.pssrs,
            approverRole: approval.approver_role,
            itemCount: 1,
            pendingSince: approval.assigned_at,
          });
        } else {
          const existing = pssrMap.get(pssrId)!;
          existing.itemCount++;
          if (new Date(approval.assigned_at) < new Date(existing.pendingSince)) {
            existing.pendingSince = approval.assigned_at;
          }
        }
      }

      return Array.from(pssrMap.values());
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: false,
  });
};

// Send review notification
export const useSendReviewNotification = () => {
  return useMutation({
    mutationFn: async ({ 
      pssrId, 
      approverRole,
      approverEmail,
      approverUserId,
      itemIds,
      isReminder = false
    }: { 
      pssrId: string;
      approverRole: string;
      approverEmail?: string;
      approverUserId?: string;
      itemIds?: string[];
      isReminder?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-pssr-item-review-notification', {
        body: { pssrId, approverRole, approverEmail, approverUserId, itemIds, isReminder }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: data.message || 'Notification Sent',
        description: `Review request sent to ${data.approverRole || 'approver'}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Send Notification',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
