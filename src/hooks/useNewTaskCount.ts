import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { fetchB2BPartnerIds } from './useB2BPartner';

/**
 * Returns the count of tasks created since the user's last login.
 * Used to show a badge on the "My Tasks" sidebar item.
 * Includes B2B partner's pending tasks (same inbox model).
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

      const partnerIds = await fetchB2BPartnerIds(user.id);
      const effectiveUserIds = [user.id, ...partnerIds];

      // Build query for pending/in_progress tasks
      let query = supabase
        .from('user_tasks')
        .select('id', { count: 'exact', head: true })
        .in('user_id', effectiveUserIds)
        .in('status', ['pending', 'in_progress']);

      // If last_login_at exists, only count tasks created after it
      // If null (first login or never visited tasks), count ALL pending tasks
      if (profile?.last_login_at) {
        query = query.gt('created_at', profile.last_login_at);
      }

      const { count, error } = await query;

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
