import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ORPActivity {
  id: string;
  orp_plan_id: string;
  user_id: string;
  activity_type: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  metadata: any;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
}

export const useORPActivityLog = (planId: string) => {
  return useQuery({
    queryKey: ['orp-activity-log', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_activity_log')
        .select('*')
        .eq('orp_plan_id', planId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch user details for each activity
      const activitiesWithUsers = await Promise.all(
        (data || []).map(async (activity) => {
          const { data: user } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', activity.user_id)
            .single();

          return {
            ...activity,
            user: user || undefined
          };
        })
      );

      return activitiesWithUsers as ORPActivity[];
    },
    enabled: !!planId
  });
};
