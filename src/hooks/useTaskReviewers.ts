import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface TaskReviewer {
  id: string;
  task_id: string;
  user_id: string | null;
  role_label: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments: string | null;
  decided_at: string | null;
  display_order: number;
  created_at: string;
  // Joined profile data
  full_name: string | null;
  avatar_url: string | null;
}

export const useTaskReviewers = (taskId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reviewers = [], isLoading } = useQuery({
    queryKey: ['task-reviewers', taskId],
    queryFn: async (): Promise<TaskReviewer[]> => {
      if (!taskId) return [];

      const { data, error } = await (supabase as any)
        .from('task_reviewers')
        .select('id, task_id, user_id, role_label, status, comments, decided_at, display_order, created_at')
        .eq('task_id', taskId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Resolve profiles
      const userIds = [...new Set(data.filter((r: any) => r.user_id).map((r: any) => r.user_id))] as string[];
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        for (const p of profiles || []) {
          let resolvedUrl: string | null = null;
          if (p.avatar_url) {
            resolvedUrl = p.avatar_url.startsWith('http')
              ? p.avatar_url
              : supabase.storage.from('user-avatars').getPublicUrl(p.avatar_url).data.publicUrl;
          }
          profileMap.set(p.user_id, { full_name: p.full_name, avatar_url: resolvedUrl });
        }
      }

      return data.map((r: any) => {
        const profile = profileMap.get(r.user_id);
        return {
          ...r,
          full_name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
        };
      });
    },
    enabled: !!taskId,
  });

  const { mutateAsync: addReviewer, isPending: isAdding } = useMutation({
    mutationFn: async ({ userId, roleLabel }: { userId: string; roleLabel: string }) => {
      if (!taskId) throw new Error('No task ID');

      const { error } = await (supabase as any)
        .from('task_reviewers')
        .insert({
          task_id: taskId,
          user_id: userId,
          role_label: roleLabel,
          status: 'PENDING',
          display_order: reviewers.length + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-reviewers', taskId] });
      // Also invalidate user-tasks so the reviewer's tray updates
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    },
  });

  const { mutateAsync: removeReviewer } = useMutation({
    mutationFn: async (reviewerId: string) => {
      const { error } = await (supabase as any)
        .from('task_reviewers')
        .delete()
        .eq('id', reviewerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-reviewers', taskId] });
    },
  });

  const { mutateAsync: submitDecision, isPending: isSubmitting } = useMutation({
    mutationFn: async ({ reviewerId, decision, comments }: { reviewerId: string; decision: 'APPROVED' | 'REJECTED'; comments?: string }) => {
      const { error } = await (supabase as any)
        .from('task_reviewers')
        .update({
          status: decision,
          decided_at: new Date().toISOString(),
          comments: comments || null,
        })
        .eq('id', reviewerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-reviewers', taskId] });
    },
  });

  const approvedCount = reviewers.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = reviewers.filter(r => r.status === 'REJECTED').length;
  const totalCount = reviewers.length;
  const allApproved = totalCount > 0 && approvedCount === totalCount;
  const hasRejection = rejectedCount > 0;
  const isCurrentUserReviewer = reviewers.some(r => r.user_id === user?.id);
  const currentUserReview = reviewers.find(r => r.user_id === user?.id);

  return {
    reviewers,
    isLoading,
    addReviewer,
    isAdding,
    removeReviewer,
    submitDecision,
    isSubmitting,
    approvedCount,
    rejectedCount,
    totalCount,
    allApproved,
    hasRejection,
    isCurrentUserReviewer,
    currentUserReview,
  };
};
