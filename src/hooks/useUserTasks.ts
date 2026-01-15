import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // Fetch tasks and dependencies in parallel for better performance
        const [tasksResult, depsResult] = await Promise.all([
          supabase
            .from('user_tasks')
            .select('*')
            .eq('status', 'pending')
            .order('display_order', { ascending: true })
            .order('priority', { ascending: false })
            .order('due_date', { ascending: true }),
          supabase
            .from('task_dependencies')
            .select('*')
        ]);

        if (tasksResult.error) throw tasksResult.error;
        if (depsResult.error) throw depsResult.error;

        const tasksData = tasksResult.data;
        const depsData = depsResult.data;

        setDependencies(depsData || []);

        // Enrich tasks with dependency information
        const enrichedTasks = (tasksData || []).map(task => {
          const blockingTasks = (depsData || [])
            .filter(dep => dep.depends_on_task_id === task.id)
            .map(dep => dep.task_id);
          
          const blockedByTasks = (depsData || [])
            .filter(dep => dep.task_id === task.id)
            .map(dep => dep.depends_on_task_id);

          return {
            ...task,
            blocking_tasks: blockingTasks,
            blocked_by_tasks: blockedByTasks
          };
        });

        setTasks(enrichedTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: "Error",
          description: "Failed to load tasks",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('user-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tasks',
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
