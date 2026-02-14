import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
}

export interface UserTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  type: string;
  status: string;
  display_order: number;
  created_at: string;
  blocking_tasks?: string[];
  blocked_by_tasks?: string[];
}

const fetchUserTasks = async (userId: string): Promise<{ tasks: UserTask[]; dependencies: TaskDependency[] }> => {
  const { data: tasksData, error: tasksError } = await supabase
    .from('user_tasks')
    .select('id,title,description,due_date,priority,type,status,display_order,created_at')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('display_order', { ascending: true })
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true });

  if (tasksError) throw tasksError;

  const taskIds = (tasksData || []).map(t => t.id);

  let depsData: TaskDependency[] = [];
  if (taskIds.length > 0) {
    const [depsByTaskRes, depsByDependsRes] = await Promise.all([
      supabase
        .from('task_dependencies')
        .select('id,task_id,depends_on_task_id')
        .in('task_id', taskIds),
      supabase
        .from('task_dependencies')
        .select('id,task_id,depends_on_task_id')
        .in('depends_on_task_id', taskIds),
    ]);

    if (depsByTaskRes.error) throw depsByTaskRes.error;
    if (depsByDependsRes.error) throw depsByDependsRes.error;

    const combined = [
      ...(depsByTaskRes.data || []),
      ...(depsByDependsRes.data || []),
    ];

    const seen = new Set<string>();
    depsData = combined.filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }

  // Enrich tasks with dependency information
  const enrichedTasks = (tasksData || []).map(task => {
    const blockingTasks = depsData
      .filter(dep => dep.depends_on_task_id === task.id)
      .map(dep => dep.task_id);

    const blockedByTasks = depsData
      .filter(dep => dep.task_id === task.id)
      .map(dep => dep.depends_on_task_id);

    return {
      ...task,
      blocking_tasks: blockingTasks,
      blocked_by_tasks: blockedByTasks,
    };
  });

  return { tasks: enrichedTasks, dependencies: depsData };
};

export const useUserTasks = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const refreshTimerRef = useRef<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['user-tasks', user?.id],
    queryFn: () => fetchUserTasks(user!.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: false,
  });

  // Real-time subscription with debounced refresh
  useEffect(() => {
    if (!user?.id) return;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['user-tasks', user.id] });
      }, 250);
    };

    const channel = supabase
      .channel('user-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tasks',
          filter: `user_id=eq.${user.id}`,
        },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_dependencies',
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: 'completed' | 'cancelled' }) => {
      const { error } = await supabase
        .from('user_tasks')
        .update({ status })
        .eq('id', taskId);
      if (error) throw error;

      // Back-to-back logic: if completing any task, also complete matching tasks
      // for users sharing the same functional_email_address (applies to all task types)
      if (status === 'completed' && user?.id) {
        try {
          // Get the completed task details
          const { data: completedTask } = await supabase
            .from('user_tasks')
            .select('type, metadata, title')
            .eq('id', taskId)
            .single();

          if (completedTask) {
            // Get current user's functional email
            const { data: currentProfile } = await supabase
              .from('profiles')
              .select('functional_email_address')
              .eq('user_id', user.id)
              .single();

            const funcEmail = currentProfile?.functional_email_address;
            if (funcEmail) {
              // Find back-to-back users (same functional email, different user)
              const { data: backToBackUsers } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('functional_email_address', funcEmail)
                .neq('user_id', user.id)
                .eq('is_active', true);

              if (backToBackUsers?.length) {
                const backToBackUserIds = backToBackUsers.map(u => u.user_id);
                
                // Build filter based on task type
                let query = supabase
                  .from('user_tasks')
                  .update({ status: 'completed' })
                  .in('user_id', backToBackUserIds)
                  .eq('type', completedTask.type)
                  .eq('status', 'pending');

                // If task has metadata with template_id, filter by that too
                if (completedTask.metadata && (completedTask.metadata as any)?.template_id) {
                  const templateId = (completedTask.metadata as any).template_id;
                  query = query.filter('metadata->>template_id', 'eq', templateId);
                }

                await query;
              }
            }
          }
        } catch (e) {
          // Non-critical: log but don't fail the main action
          console.warn('Back-to-back task completion check failed:', e);
        }
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({ title: "Success", description: `Task ${status}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('user_tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedTasks: UserTask[]) => {
      const updates = reorderedTasks.map((task, index) =>
        supabase.from('user_tasks').update({ display_order: index }).eq('id', task.id)
      );
      await Promise.all(updates);
      return reorderedTasks;
    },
    onMutate: async (reorderedTasks) => {
      // Optimistic update
      queryClient.setQueryData(['user-tasks', user?.id], (old: any) => ({
        ...old,
        tasks: reorderedTasks.map((task, index) => ({ ...task, display_order: index })),
      }));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({ title: "Error", description: "Failed to reorder tasks", variant: "destructive" });
    },
  });

  const addDependencyMutation = useMutation({
    mutationFn: async ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) => {
      const { error } = await supabase.from('task_dependencies').insert({
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({ title: "Success", description: "Task dependency added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add task dependency", variant: "destructive" });
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: async ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('task_id', taskId)
        .eq('depends_on_task_id', dependsOnTaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({ title: "Success", description: "Task dependency removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove dependency", variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ taskIds, status }: { taskIds: string[]; status: 'completed' | 'cancelled' }) => {
      const updates = taskIds.map(id => supabase.from('user_tasks').update({ status }).eq('id', id));
      await Promise.all(updates);
    },
    onSuccess: (_, { taskIds, status }) => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({ title: "Success", description: `${taskIds.length} task(s) ${status}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tasks", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const deletes = taskIds.map(id => supabase.from('user_tasks').delete().eq('id', id));
      await Promise.all(deletes);
    },
    onSuccess: (_, taskIds) => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({ title: "Success", description: `${taskIds.length} task(s) deleted` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tasks", variant: "destructive" });
    },
  });

  return {
    tasks: data?.tasks || [],
    dependencies: data?.dependencies || [],
    loading: isLoading,
    updateTaskStatus: (taskId: string, status: 'completed' | 'cancelled') =>
      updateStatusMutation.mutate({ taskId, status }),
    deleteTask: (taskId: string) => deleteMutation.mutateAsync(taskId),
    reorderTasks: (reorderedTasks: UserTask[]) => reorderMutation.mutate(reorderedTasks),
    addDependency: (taskId: string, dependsOnTaskId: string) =>
      addDependencyMutation.mutate({ taskId, dependsOnTaskId }),
    removeDependency: (taskId: string, dependsOnTaskId: string) =>
      removeDependencyMutation.mutate({ taskId, dependsOnTaskId }),
    bulkUpdateStatus: (taskIds: string[], status: 'completed' | 'cancelled') =>
      bulkUpdateMutation.mutate({ taskIds, status }),
    bulkDelete: (taskIds: string[]) => bulkDeleteMutation.mutate(taskIds),
  };
};
