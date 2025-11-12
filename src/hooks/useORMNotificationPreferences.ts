import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ORMNotificationPreferences {
  id: string;
  user_id: string;
  digest_frequency: 'daily' | 'weekly' | 'never';
  include_pending_reviews: boolean;
  include_overdue_tasks: boolean;
  include_milestone_progress: boolean;
  digest_time: string;
  created_at: string;
  updated_at: string;
}

export const useORMNotificationPreferences = () => {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['orm-notification-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orm_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Return default preferences if none exist
      if (!data) {
        return {
          digest_frequency: 'weekly',
          include_pending_reviews: true,
          include_overdue_tasks: true,
          include_milestone_progress: true,
          digest_time: '09:00:00',
        } as Partial<ORMNotificationPreferences>;
      }

      return data as ORMNotificationPreferences;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs: Partial<ORMNotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orm_notification_preferences')
        .upsert({
          user_id: user.id,
          ...prefs,
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-notification-preferences'] });
      toast({
        title: 'Preferences saved',
        description: 'Your ORM notification preferences have been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences.',
        variant: 'destructive',
      });
      console.error('Error updating ORM notification preferences:', error);
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
  };
};
