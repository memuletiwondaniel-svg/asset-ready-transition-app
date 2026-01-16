import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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
  blocking_tasks?: string[]; // IDs of tasks this task is blocking
  blocked_by_tasks?: string[]; // IDs of tasks blocking this task
}

export const useUserTasks = () => {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refreshTimerRef = useRef<number | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const scheduleRefresh = (fetchFn: () => Promise<void>) => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        void fetchFn();
      }, 250);
    };

    const fetchTasks = async () => {
      const userId = userIdRef.current;
      if (!userId) {
        setTasks([]);
        setDependencies([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

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

        // Only fetch dependencies relevant to the user's tasks (avoids loading the entire table)
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

          // de-dupe by id
          const seen = new Set<string>();
          depsData = combined.filter(d => {
            if (seen.has(d.id)) return false;
            seen.add(d.id);
            return true;
          });
        }

        if (cancelled) return;

        setDependencies(depsData);

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

        setTasks(enrichedTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tasks',
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const init = async () => {
      const { data: authData, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
      }

      userIdRef.current = authData.user?.id ?? null;

      await fetchTasks();

      // Subscribe to real-time updates (scoped to the current user to avoid unnecessary refreshes)
      const userId = userIdRef.current;
      if (!userId) return;

      channel = supabase
        .channel('user-tasks-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_tasks',
            filter: `user_id=eq.${userId}`,
          },
          () => scheduleRefresh(fetchTasks)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_dependencies',
          },
          () => scheduleRefresh(fetchTasks)
        )
        .subscribe();
    };

    void init();

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [toast]);

  const updateTaskStatus = async (taskId: string, status: 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('user_tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Task ${status}`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('user_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Optimistically update the local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const reorderTasks = async (reorderedTasks: UserTask[]) => {
    try {
      // Update display_order for all tasks
      const updates = reorderedTasks.map((task, index) => 
        supabase
          .from('user_tasks')
          .update({ display_order: index })
          .eq('id', task.id)
      );

      await Promise.all(updates);
      
      // Optimistically update local state
      setTasks(reorderedTasks.map((task, index) => ({ ...task, display_order: index })));
    } catch (error) {
      console.error('Error reordering tasks:', error);
      toast({
        title: "Error",
        description: "Failed to reorder tasks",
        variant: "destructive",
      });
    }
  };

  const addDependency = async (taskId: string, dependsOnTaskId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('task_dependencies')
        .insert({
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task dependency added",
      });
    } catch (error) {
      console.error('Error adding dependency:', error);
      toast({
        title: "Error",
        description: "Failed to add task dependency",
        variant: "destructive",
      });
    }
  };

  const removeDependency = async (taskId: string, dependsOnTaskId: string) => {
    try {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('task_id', taskId)
        .eq('depends_on_task_id', dependsOnTaskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task dependency removed",
      });
    } catch (error) {
      console.error('Error removing dependency:', error);
      toast({
        title: "Error",
        description: "Failed to remove dependency",
        variant: "destructive",
      });
    }
  };

  const bulkUpdateStatus = async (taskIds: string[], status: 'completed' | 'cancelled') => {
    try {
      const updates = taskIds.map(id => 
        supabase
          .from('user_tasks')
          .update({ status })
          .eq('id', id)
      );

      await Promise.all(updates);

      toast({
        title: "Success",
        description: `${taskIds.length} task(s) ${status}`,
      });
    } catch (error) {
      console.error('Error bulk updating tasks:', error);
      toast({
        title: "Error",
        description: "Failed to update tasks",
        variant: "destructive",
      });
    }
  };

  const bulkDelete = async (taskIds: string[]) => {
    try {
      const deletes = taskIds.map(id => 
        supabase
          .from('user_tasks')
          .delete()
          .eq('id', id)
      );

      await Promise.all(deletes);

      // Optimistically update local state
      setTasks(prevTasks => prevTasks.filter(task => !taskIds.includes(task.id)));

      toast({
        title: "Success",
        description: `${taskIds.length} task(s) deleted`,
      });
    } catch (error) {
      console.error('Error bulk deleting tasks:', error);
      toast({
        title: "Error",
        description: "Failed to delete tasks",
        variant: "destructive",
      });
    }
  };

  return { 
    tasks, 
    dependencies,
    loading, 
    updateTaskStatus,
    deleteTask,
    reorderTasks,
    addDependency,
    removeDependency,
    bulkUpdateStatus,
    bulkDelete
  };
};
