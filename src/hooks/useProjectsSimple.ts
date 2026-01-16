import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectSimple {
  id: string;
  project_id_prefix: string;
  project_id_number: string;
  project_title: string;
}

export const useProjectsSimple = () => {
  return useQuery({
    queryKey: ['projects-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_id_prefix, project_id_number, project_title')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProjectSimple[];
    },
    staleTime: 60000, // Cache for 1 minute
  });
};
