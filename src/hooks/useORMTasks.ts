import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useORMTasks = (deliverableId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['orm-tasks', deliverableId],
    queryFn: async () => {
      let query = supabase
        .from('orm_tasks')
        .select(`
          *,
          assigned_user:profiles!orm_tasks_assigned_to_fkey(full_name, avatar_url, email),
          created_by_user:profiles!orm_tasks_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (deliverableId) {
        query = query.eq('deliverable_id', deliverableId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: deliverableId !== undefined
  });

  const createTask = useMutation({
    mutationFn: async (data: {
      deliverable_id: string;
      title: string;
      description?: string;
      assigned_to: string;
      due_date?: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('orm_tasks')
        .insert({
          deliverable_id: data.deliverable_id,
          title: data.title,
          description: data.description,
          assigned_to: data.assigned_to,
          due_date: data.due_date,
          priority: data.priority,
          created_by: user.user.id,
          status: 'PENDING'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-tasks'] });
      toast({
        title: 'Success',
        description: 'Task created successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateTask = useMutation({
    mutationFn: async (data: {
      taskId: string;
      updates: {
        title?: string;
        description?: string;
        status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
        priority?: 'LOW' | 'MEDIUM' | 'HIGH';
        due_date?: string;
        completion_date?: string;
      };
    }) => {
      const { error } = await supabase
        .from('orm_tasks')
        .update(data.updates)
        .eq('id', data.taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-tasks'] });
      toast({
        title: 'Success',
        description: 'Task updated successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('orm_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-tasks'] });
      toast({
        title: 'Success',
        description: 'Task deleted successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    tasks,
    isLoading,
    createTask: createTask.mutate,
    updateTask: updateTask.mutate,
    deleteTask: deleteTask.mutate,
    isCreating: createTask.isPending,
    isUpdating: updateTask.isPending
  };
};

// Hook for getting all tasks across projects for resource capacity
export const useAllORMTasks = () => {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['all-orm-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orm_tasks')
        .select(`
          *,
          assigned_user:profiles!orm_tasks_assigned_to_fkey(full_name, avatar_url, email),
          deliverable:orm_deliverables(
            deliverable_type,
            orm_plan:orm_plans(
              project:projects(project_title)
            )
          )
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  return { tasks, isLoading };
};
