import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

interface ActivityComment {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const useORAActivityComments = (activityId: string | undefined, planId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['ora-activity-comments', activityId],
    queryFn: async (): Promise<ActivityComment[]> => {
      if (!activityId) return [];

      const { data, error } = await (supabase as any)
        .from('ora_activity_comments')
        .select('id, comment, created_at, user_id')
        .eq('ora_plan_activity_id', activityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return data.map((c: any) => {
        const profile = profileMap.get(c.user_id);
        return {
          ...c,
          full_name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
        };
      });
    },
    enabled: !!activityId,
  });

  const { mutateAsync: addComment, isPending: isAdding } = useMutation({
    mutationFn: async (commentText: string) => {
      if (!activityId || !planId || !user) throw new Error('Missing context');

      const { error } = await (supabase as any)
        .from('ora_activity_comments')
        .insert({
          ora_plan_activity_id: activityId,
          orp_plan_id: planId,
          user_id: user.id,
          comment: commentText,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-activity-comments', activityId] });
    },
  });

  return { comments, isLoading, addComment, isAdding };
};
