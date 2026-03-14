import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  comment_type: string;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const useTaskComments = (taskId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async (): Promise<TaskComment[]> => {
      if (!taskId) return [];

      const { data, error } = await (supabase as any)
        .from('task_comments')
        .select('id, task_id, user_id, comment, comment_type, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data?.length) return [];

      // Fetch profile info for comment authors
      const userIds = [...new Set(data.map((c: any) => c.user_id))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      for (const p of profiles || []) {
        profileMap.set(p.user_id, {
          full_name: p.full_name,
          avatar_url: p.avatar_url?.startsWith('http')
            ? p.avatar_url
            : p.avatar_url
              ? supabase.storage.from('user-avatars').getPublicUrl(p.avatar_url).data.publicUrl
              : null,
        });
      }

      return data.map((c: any) => ({
        ...c,
        ...(profileMap.get(c.user_id) || { full_name: 'Unknown', avatar_url: null }),
      }));
    },
    enabled: !!taskId,
  });

  const { mutateAsync: addComment, isPending: isAddingComment } = useMutation({
    mutationFn: async (commentText: string) => {
      if (!taskId || !user) throw new Error('Missing context');
      const { error } = await (supabase as any).from('task_comments').insert({
        task_id: taskId,
        user_id: user.id,
        comment: commentText,
        comment_type: 'comment',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });

  return { comments, isLoading, addComment, isAddingComment };
};
