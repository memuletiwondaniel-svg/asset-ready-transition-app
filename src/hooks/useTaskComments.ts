import { useEffect, useState } from 'react';
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

const normalizeOraActivityId = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  if (raw.startsWith('ora-')) return raw.slice(4);
  if (raw.startsWith('ws-')) return raw.slice(3);
  return raw;
};

export const useTaskComments = (taskId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRealtimeHealthy, setIsRealtimeHealthy] = useState(false);

  useEffect(() => {
    if (!taskId) return;

    setIsRealtimeHealthy(false);

    const channel = supabase
      .channel(`task-comments:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeHealthy(true);
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsRealtimeHealthy(false);
          queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
        }
      });

    return () => {
      setIsRealtimeHealthy(false);
      supabase.removeChannel(channel);
    };
  }, [queryClient, taskId]);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async (): Promise<TaskComment[]> => {
      if (!taskId) return [];

      const [{ data: taskComments, error: taskCommentsError }, { data: taskRow }] = await Promise.all([
        (supabase as any)
          .from('task_comments')
          .select('id, task_id, user_id, comment, comment_type, created_at')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('user_tasks')
          .select('metadata')
          .eq('id', taskId)
          .maybeSingle(),
      ]);

      if (taskCommentsError) throw taskCommentsError;

      const metadata = (taskRow?.metadata || {}) as Record<string, any>;
      const oraActivityId = normalizeOraActivityId(
        (metadata.ora_plan_activity_id as string | undefined) ||
        (metadata.ora_activity_id as string | undefined)
      );
      const oraPlanId = metadata.plan_id as string | undefined;

      let legacyOraComments: Array<{ id: string; user_id: string; comment: string; created_at: string }> = [];

      if (oraActivityId) {
        let legacyQuery = (supabase as any)
          .from('ora_activity_comments')
          .select('id, user_id, comment, created_at')
          .eq('ora_plan_activity_id', oraActivityId)
          .order('created_at', { ascending: false });

        if (oraPlanId) {
          legacyQuery = legacyQuery.eq('orp_plan_id', oraPlanId);
        }

        const { data: legacyData, error: legacyError } = await legacyQuery;
        if (!legacyError && legacyData?.length) {
          legacyOraComments = legacyData;
        }
      }

      const normalizedTaskComments: TaskComment[] = (taskComments || []).map((c: any) => ({
        ...c,
        full_name: null,
        avatar_url: null,
      }));

      const normalizedLegacyComments: TaskComment[] = legacyOraComments.map((c) => ({
        id: `ora-${c.id}`,
        task_id: taskId,
        user_id: c.user_id,
        comment: c.comment,
        comment_type: 'legacy_ora_comment',
        created_at: c.created_at,
        full_name: null,
        avatar_url: null,
      }));

      const dedupedMap = new Map<string, TaskComment>();
      for (const entry of [...normalizedTaskComments, ...normalizedLegacyComments]) {
        const dedupeKey = `${entry.user_id}|${entry.comment}|${entry.created_at}`;
        const existing = dedupedMap.get(dedupeKey);
        if (!existing || existing.comment_type === 'legacy_ora_comment') {
          dedupedMap.set(dedupeKey, entry);
        }
      }

      const merged = Array.from(dedupedMap.values());
      if (!merged.length) return [];

      const userIds = [...new Set(merged.map((c) => c.user_id).filter(Boolean))] as string[];
      const { data: profiles } = userIds.length
        ? await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', userIds)
        : { data: [] };

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

      return merged
        .map((c) => ({
          ...c,
          ...(profileMap.get(c.user_id) || { full_name: 'Unknown', avatar_url: null }),
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!taskId,
    refetchInterval: taskId ? (isRealtimeHealthy ? 10000 : 3000) : false,
    refetchIntervalInBackground: true,
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
