import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Hub {
  id: string;
  name: string;
  description?: string;
}

export const useHubs = () => {
  return useQuery({
    queryKey: ['hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching hubs:', error);
        throw error;
      }

      return data as Hub[];
    },
  });
};