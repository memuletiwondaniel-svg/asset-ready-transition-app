import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MockPSSRReview, PSSR_APPROVAL_ROLES } from './useMyTasksMockData';

interface ProjectWithLocation {
  id: string;
  project_id_prefix: string;
  project_id_number: string;
  project_title: string;
  plant: { name: string } | null;
  station: { name: string } | null;
  hub: { name: string } | null;
}

// Fetch actual projects with their location data
export function useProjectsForMockData() {
  return useQuery({
    queryKey: ['projects-for-mock-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          project_id_prefix,
          project_id_number,
          project_title,
          plant:plant_id(name),
          station:station_id(name),
          hub:hub_id(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as ProjectWithLocation[];
    },
    staleTime: 60000 * 5, // Cache for 5 minutes
  });
}

// Generate mock PSSR reviews using actual projects
export function useMockPSSRReviewsFromProjects(): {
  reviews: MockPSSRReview[];
  isLoading: boolean;
} {
  const { data: projects, isLoading } = useProjectsForMockData();
  
  const reviews = useMemo(() => {
    if (!projects || projects.length === 0) {
      return [];
    }
    
    const now = new Date();
    const approverRoles = PSSR_APPROVAL_ROLES;
    
    // Generate 4-6 mock reviews from actual projects
    const numReviews = Math.min(projects.length, 6);
    const selectedProjects = projects.slice(0, numReviews);
    
    return selectedProjects.map((project, index) => {
      const projectCode = `${project.project_id_prefix}-${project.project_id_number}`;
      const pssrNumber = String(index + 1).padStart(3, '0');
      
      // Vary the days pending for visual variety
      const daysPendingOptions = [1, 2, 3, 5, 7, 10];
      const daysPending = daysPendingOptions[index % daysPendingOptions.length];
      
      // Vary item counts
      const itemCountOptions = [6, 8, 10, 12, 15, 18];
      const itemCount = itemCountOptions[index % itemCountOptions.length];
      
      // Get location name (prefer plant, then station, then hub)
      const locationName = project.plant?.name || project.station?.name || project.hub?.name || 'Unknown Location';
      
      // Cycle through approver roles
      const approverRole = approverRoles[index % approverRoles.length];
      
      return {
        id: `mock-pssr-${index + 1}`,
        pssr: {
          id: `pssr-${projectCode.toLowerCase().replace('-', '')}-${pssrNumber}`,
          pssr_id: `PSSR-${project.project_id_prefix}${project.project_id_number}-${pssrNumber}`,
          project_name: project.project_title,
          asset: locationName,
          scope: `Pre-startup safety review for ${project.project_title}`,
        },
        approverRole,
        itemCount,
        pendingSince: new Date(now.getTime() - daysPending * 24 * 60 * 60 * 1000).toISOString(),
      } as MockPSSRReview;
    });
  }, [projects]);
  
  return { reviews, isLoading };
}
