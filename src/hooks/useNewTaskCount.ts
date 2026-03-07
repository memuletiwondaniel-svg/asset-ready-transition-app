import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

/**
 * Returns the count of tasks created since the user's last login.
 * Used to show a badge on the "My Tasks" sidebar item.
 */
export const useNewTaskCount = () => {
  const { user } = useAuth();

  const { data: newTaskCount = 0 } = useQuery({
    queryKey: ['new-task-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Get user's last login timestamp
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_login_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.last_login_at) return 0;

      // Count tasks created after last login
      const { count, error } = await supabase
        .from('user_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('created_at', profile.last_login_at)
        .in('status', ['pending', 'in_progress']);

      if (error) {
        console.error('Error fetching new task count:', error);
        return 0;
      }

      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return newTaskCount;
};
