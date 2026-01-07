import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortfolioUser {
  user_id: string;
  full_name: string;
  position: string | null;
  role: string | null;
}

export interface ProjectWithDetails {
  id: string;
  project_id_prefix: string;
  project_id_number: string;
  project_title: string;
  status?: string;
  hub_id: string;
}

export interface MilestoneDetails {
  id: string;
  project_id: string;
  milestone_name: string;
  milestone_date: string | null;
  status: string | null;
}

export const usePortfolioDetails = (regionName: string | null, hubName: string | null) => {
  // Fetch users for portfolio/hub
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['portfolio-details-users', regionName, hubName],
    queryFn: async () => {
      if (!regionName) return [];
      
      let query = supabase
        .from('profiles')
        .select('user_id, full_name, position, role')
        .eq('status', 'active');
      
      if (hubName) {
        // For hub view, get users associated with this hub
        query = query.or(`position.ilike.%${hubName}%`);
      } else {
        // For portfolio view, get all users in this region
        query = query.or(`position.ilike.%${regionName}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching portfolio users:', error);
        return [];
      }
      
      return (data || []) as PortfolioUser[];
    },
    enabled: !!regionName
  });

  // Fetch projects with status
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['portfolio-details-projects', regionName, hubName],
    queryFn: async () => {
      if (!regionName) return [];
      
      // Get hub IDs for the region or specific hub
      const { data: hubsData } = await supabase
        .from('hubs')
        .select('id, name')
        .eq('is_active', true);
      
      const { data: hubRegionData } = await supabase
        .from('project_hub_region')
        .select('hub_id, region_id');
      
      const { data: regionsData } = await supabase
        .from('project_region')
        .select('id, name')
        .eq('is_active', true);
      
      // Find the region ID
      const region = regionsData?.find(r => r.name === regionName);
      if (!region) return [];
      
      // Get hub IDs in this region
      const hubIdsInRegion = hubRegionData
        ?.filter(hr => hr.region_id === region.id)
        .map(hr => hr.hub_id) || [];
      
      // If specific hub, filter to that hub
      let targetHubIds = hubIdsInRegion;
      if (hubName) {
        const hub = hubsData?.find(h => h.name === hubName);
        if (hub) {
          targetHubIds = [hub.id];
        }
      }
      
      if (targetHubIds.length === 0) return [];
      
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('id, project_id_prefix, project_id_number, project_title, hub_id')
        .eq('is_active', true)
        .in('hub_id', targetHubIds);
      
      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }
      
      return (projectsData || []) as ProjectWithDetails[];
    },
    enabled: !!regionName
  });

  // Fetch milestones for projects
  const { data: milestones, isLoading: milestonesLoading } = useQuery({
    queryKey: ['portfolio-details-milestones', projects?.map(p => p.id)],
    queryFn: async () => {
      if (!projects || projects.length === 0) return [];
      
      const { data, error } = await supabase
        .from('project_milestones')
        .select('id, project_id, milestone_name, milestone_date, status')
        .in('project_id', projects.map(p => p.id))
        .order('milestone_date');
      
      if (error) {
        console.error('Error fetching milestones:', error);
        return [];
      }
      
      return (data || []) as MilestoneDetails[];
    },
    enabled: !!projects && projects.length > 0
  });

  // Helper to categorize users by role
  const categorizedUsers = {
    projectManagers: users?.filter(u => 
      u.position?.toLowerCase().includes('project manager') || 
      u.position?.toLowerCase().includes('proj manager')
    ) || [],
    hubLeads: users?.filter(u => 
      u.position?.toLowerCase().includes('hub lead')
    ) || [],
    projectEngineers: users?.filter(u => 
      u.position?.toLowerCase().includes('project engr') ||
      u.position?.toLowerCase().includes('proj engr')
    ) || [],
    others: users?.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      return !pos.includes('project manager') && 
             !pos.includes('proj manager') &&
             !pos.includes('hub lead') &&
             !pos.includes('project engr') &&
             !pos.includes('proj engr');
    }) || []
  };

  return {
    users,
    categorizedUsers,
    projects,
    milestones,
    isLoading: usersLoading || projectsLoading || milestonesLoading
  };
};
