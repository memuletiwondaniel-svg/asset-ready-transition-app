import { useEffect, useRef, useCallback, useMemo } from 'react';
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

export const useORAActivityComments = (
  activityId: string | undefined,
  planId: string | undefined,
  taskId?: string
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastSeenRef = useRef<string | null>(null);

  const queryKey = ['ora-activity-comments', activityId] as const;

  const fetchComments = useCallback(async (): Promise<ActivityComment[]> => {
    if (!activityId) return [];

    const { data, error } = await (supabase as any)
      .from('ora_activity_comments')
      .select('id, comment, created_at, user_id')
      .eq('ora_plan_activity_id', activityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Fetch profiles for all unique user_ids
    const userIds = [...new Set(data.map((c: any) => c.user_id))] as string[];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    // Build profile map with resolved avatar URLs
    const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    for (const p of profiles || []) {
      let resolvedAvatarUrl: string | null = null;
      if (p.avatar_url) {
        // If already a full URL, use as-is; otherwise resolve from storage
        if (p.avatar_url.startsWith('http')) {
          resolvedAvatarUrl = p.avatar_url;
        } else {
          const { data: urlData } = supabase.storage
            .from('user-avatars')
            .getPublicUrl(p.avatar_url);
          resolvedAvatarUrl = urlData?.publicUrl || null;
        }
      }
      profileMap.set(p.user_id, { full_name: p.full_name, avatar_url: resolvedAvatarUrl });
    }

    // Defensive dedupe by id in case of duplicated joins/merges
    const deduped = new Map<string, ActivityComment>();
    for (const c of data as any[]) {
      const profile = profileMap.get(c.user_id);
      deduped.set(c.id, {
        ...c,
        full_name: profile?.full_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
      });
    }

    return Array.from(deduped.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [activityId]);

  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: fetchComments,
    enabled: !!activityId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Track latest seen timestamp for polling fallback
  useEffect(() => {
    const latest = comments[0]?.created_at;
    if (latest) {
      lastSeenRef.current = latest;
    }
  }, [comments]);

  // Realtime + polling fallback to keep all clients consistent
  useEffect(() => {
    if (!activityId) return;

    let isActive = true;
    let pollIntervalMs = 2000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const refreshFeed = async (latestTs?: string | null) => {
      if (!isActive) return;
      if (latestTs) {
        lastSeenRef.current = latestTs;
      }
      pollIntervalMs = 2000;
      await queryClient.invalidateQueries({ queryKey });
    };

    // Primary channel for ORA activity comments (if table is in realtime publication)
    const oraChannel = supabase
      .channel(`ora-activity-comments:${activityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ora_activity_comments',
          filter: `ora_plan_activity_id=eq.${activityId}`,
        },
        async (payload: any) => {
          const latestTs = payload?.new?.created_at || payload?.new?.updated_at || null;
          await refreshFeed(latestTs);
        }
      )
      .subscribe();

    // Secondary channel for task_comments (published) to catch workflow decisions fast
    const taskChannel = taskId
      ? supabase
          .channel(`task-comments:${taskId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'task_comments',
              filter: `task_id=eq.${taskId}`,
            },
            async () => {
              await refreshFeed();
            }
          )
          .subscribe()
      : null;

    // Polling fallback with exponential backoff
    const poll = async () => {
      if (!isActive) return;

      try {
        const { data, error } = await (supabase as any)
          .from('ora_activity_comments')
          .select('created_at')
          .eq('ora_plan_activity_id', activityId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        const latest = data?.created_at as string | null;
        const hasNew =
          !!latest &&
          (!lastSeenRef.current || new Date(latest).getTime() > new Date(lastSeenRef.current).getTime());

        if (hasNew) {
          await refreshFeed(latest);
        } else {
          pollIntervalMs = Math.min(Math.round(pollIntervalMs * 1.5), 8000);
        }
      } catch {
        pollIntervalMs = Math.min(Math.round(pollIntervalMs * 1.5), 8000);
      } finally {
        if (isActive) {
          timeoutId = setTimeout(poll, pollIntervalMs);
        }
      }
    };

    timeoutId = setTimeout(poll, pollIntervalMs);

    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(oraChannel);
      if (taskChannel) supabase.removeChannel(taskChannel);
    };
  }, [activityId, taskId, queryClient, queryKey]);

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
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return { comments, isLoading, addComment, isAdding };
};
