import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectLocation {
  id: string;
  project_id: string;
  station_id: string;
  created_at: string;
}

export function useProjectLocations(projectId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['project-locations', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_locations')
        .select('*')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data as ProjectLocation[];
    },
    enabled: !!projectId
  });

  const saveLocations = useMutation({
    mutationFn: async ({ projectId, stationIds }: { projectId: string; stationIds: string[] }) => {
      // Delete existing locations
      await supabase
        .from('project_locations')
        .delete()
        .eq('project_id', projectId);
      
      // Insert new locations
      if (stationIds.length > 0) {
        const locationData = stationIds.map(stationId => ({
          project_id: projectId,
          station_id: stationId
        }));
        
        const { error } = await supabase
          .from('project_locations')
          .insert(locationData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-locations'] });
    }
  });

  return {
    locations: query.data || [],
    isLoading: query.isLoading,
    saveLocations: saveLocations.mutateAsync
  };
}
