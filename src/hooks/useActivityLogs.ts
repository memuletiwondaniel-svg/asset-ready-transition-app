import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export const useActivityLogs = (filters?: { activityType?: string; userId?: string; startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('user_activity_logs')
        .select(`
          *,
          profiles!user_activity_logs_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.activityType) {
        query = query.eq('activity_type', filters.activityType);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(log => ({
        ...log,
        user_name: log.profiles?.full_name,
        user_email: log.profiles?.email
      })) as ActivityLog[];
    }
  });
};

export const useLogActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      activityType: string;
      description: string;
      metadata?: any;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user.id,
          activity_type: params.activityType,
          description: params.description,
          metadata: params.metadata || {}
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    }
  });
};
