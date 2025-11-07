import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface UserTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  type: string;
  status: string;
  created_at: string;
}

export const useUserTasks = () => {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('user_tasks')
          .select('*')
          .eq('status', 'pending')
          .order('priority', { ascending: false })
          .order('due_date', { ascending: true });

        if (error) throw error;
        setTasks(data || []);
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

  return { tasks, loading, updateTaskStatus };
};