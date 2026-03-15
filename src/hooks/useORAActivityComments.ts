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
  source: 'ora' | 'task'; // Track origin for deduplication
}

async function resolveProfileMap(userIds: string[]) {
  const map = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  if (userIds.length === 0) return map;
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url')
    .in('user_id', userIds);
  for (const p of profiles || []) {
    let resolvedAvatarUrl: string | null = null;
    if (p.avatar_url) {
      resolvedAvatarUrl = p.avatar_url.startsWith('http')
        ? p.avatar_url
        : supabase.storage.from('user-avatars').getPublicUrl(p.avatar_url).data.publicUrl || null;
    }
    map.set(p.user_id, { full_name: p.full_name, avatar_url: resolvedAvatarUrl });
  }
  return map;
}

export const useORAActivityComments = (
  activityId: string | undefined,
  planId: string | undefined,
  taskId?: string
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastSeenRef = useRef<string | null>(null);

  const queryKey = useMemo(() => ['ora-activity-comments', activityId] as const, [activityId]);

  const fetchComments = useCallback(async (): Promise<ActivityComment[]> => {
    if (!activityId) return [];

    // 1) Shared ORA comments
    const { data: oraComments, error: oraError } = await (supabase as any)
      .from('ora_activity_comments')
      .select('id, comment, created_at, user_id')
      .eq('ora_plan_activity_id', activityId)
      .order('created_at', { ascending: false });

    if (oraError) throw oraError;

    // 2) Resolve ALL related task IDs robustly (no fragile JSON-path OR filter)
    const relatedTaskIds = new Set<string>();
    if (taskId) relatedTaskIds.add(taskId);

    const activityVariants = [activityId, `ora-${activityId}`, `ws-${activityId}`];

    const currentTaskMetaPromise = taskId
      ? (supabase as any)
          .from('user_tasks')
          .select('metadata')
          .eq('id', taskId)
          .maybeSingle()
      : Promise.resolve({ data: null });

    const activityTaskQueryPromises = [
      ...activityVariants.map((value) =>
        (supabase as any)
          .from('user_tasks')
          .select('id')
          .contains('metadata', { ora_plan_activity_id: value })
      ),
      ...activityVariants.map((value) =>
        (supabase as any)
          .from('user_tasks')
          .select('id')
          .contains('metadata', { ora_activity_id: value })
      ),
    ];

    const [{ data: currentTaskMeta }, ...activityTaskResults] = await Promise.all([
      currentTaskMetaPromise,
      ...activityTaskQueryPromises,
    ]);

    for (const result of activityTaskResults as any[]) {
      for (const row of result?.data || []) {
        if (row?.id) relatedTaskIds.add(row.id);
      }
    }

    const sourceTaskId = (currentTaskMeta?.metadata?.source_task_id as string | undefined) || undefined;
    if (sourceTaskId) {
      relatedTaskIds.add(sourceTaskId);

      // Include reviewer tasks pointing to the same source task
      const { data: siblingReviewTasks } = await (supabase as any)
        .from('user_tasks')
        .select('id')
        .contains('metadata', { source_task_id: sourceTaskId });

      for (const row of siblingReviewTasks || []) {
        if (row?.id) relatedTaskIds.add(row.id);
      }
    }

    // 3) Fetch task comments for all related tasks
    let taskComments: any[] = [];
    const taskIdArray = Array.from(relatedTaskIds);
    if (taskIdArray.length > 0) {
      const { data: tc, error: taskCommentsError } = await (supabase as any)
        .from('task_comments')
        .select('id, task_id, comment, created_at, user_id, comment_type')
        .in('task_id', taskIdArray)
        .order('created_at', { ascending: false });

      if (taskCommentsError) {
        console.error('Failed to load related task_comments for ORA activity feed:', taskCommentsError);
      } else if (tc) {
        taskComments = tc;
      }
    }

    // 4) Resolve profile data
    const allUserIds = [
      ...new Set([
        ...(oraComments || []).map((c: any) => c.user_id),
        ...taskComments.map((c: any) => c.user_id),
      ]),
    ] as string[];
    const profileMap = await resolveProfileMap(allUserIds);

    // 5) Merge + dedupe
    const deduped = new Map<string, ActivityComment>();

    for (const c of (oraComments || []) as any[]) {
      const profile = profileMap.get(c.user_id);
      deduped.set(c.id, {
        id: c.id,
        comment: c.comment,
        created_at: c.created_at,
        user_id: c.user_id,
        full_name: profile?.full_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        source: 'ora',
      });
    }

    for (const c of taskComments) {
      const isDuplicate = Array.from(deduped.values()).some(
        (existing) =>
          existing.user_id === c.user_id &&
          existing.comment === c.comment &&
          Math.abs(new Date(existing.created_at).getTime() - new Date(c.created_at).getTime()) < 5000
      );

      if (!isDuplicate) {
        const profile = profileMap.get(c.user_id);
        deduped.set(`tc-${c.id}`, {
          id: `tc-${c.id}`,
          comment: c.comment,
          created_at: c.created_at,
          user_id: c.user_id,
          full_name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
          source: 'task',
        });
      }
    }

    return Array.from(deduped.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [activityId, taskId]);

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

  // Realtime + polling fallback
  useEffect(() => {
    if (!activityId) return;

    let isActive = true;
    let pollIntervalMs = 2000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const refreshFeed = async (latestTs?: string | null) => {
      if (!isActive) return;
      if (latestTs) lastSeenRef.current = latestTs;
      pollIntervalMs = 2000;
      await queryClient.invalidateQueries({ queryKey });
    };

    // Realtime on ora_activity_comments
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
          await refreshFeed(payload?.new?.created_at || null);
        }
      )
      .subscribe();

    // Realtime on task_comments for the current user's task
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

    // Polling fallback
    const poll = async () => {
      if (!isActive) return;
      try {
        await queryClient.invalidateQueries({ queryKey });
        pollIntervalMs = Math.min(Math.round(pollIntervalMs * 1.5), 8000);
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

      // Write to ora_activity_comments (shared across all users)
      const { error } = await (supabase as any)
        .from('ora_activity_comments')
        .insert({
          ora_plan_activity_id: activityId,
          orp_plan_id: planId,
          user_id: user.id,
          comment: commentText,
        });

      if (error) throw error;

      // Also write to task_comments for the current user's task (for task-level audit trail)
      if (taskId) {
        await (supabase as any)
          .from('task_comments')
          .insert({
            task_id: taskId,
            user_id: user.id,
            comment: commentText,
            comment_type: 'comment',
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return { comments, isLoading, addComment, isAdding };
};
