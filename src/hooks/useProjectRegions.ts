import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectRegion {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export function useProjectRegions() {
  const query = useQuery({
    queryKey: ['project-regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_region')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as ProjectRegion[];
    }
  });

  return {
    regions: query.data || [],
    isLoading: query.isLoading,
    error: query.error
  };
}
