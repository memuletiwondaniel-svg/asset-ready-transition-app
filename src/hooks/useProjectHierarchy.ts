import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectRegion {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectHub {
  id: string;
  name: string;
  description: string | null;
  regionId: string;
  displayOrder: number;
}

export interface Project {
  id: string;
  projectIdPrefix: string;
  projectIdNumber: string;
  projectTitle: string;
  hubId: string | null;
  plantId: string | null;
  stationId: string | null;
}

export interface HubWithProjects extends ProjectHub {
  projects: Project[];
}

export interface RegionWithHubs extends ProjectRegion {
  hubs: HubWithProjects[];
}

export function useProjectHierarchy() {
  const [regions, setRegions] = useState<RegionWithHubs[]>([]);
  const [unassignedHubs, setUnassignedHubs] = useState<ProjectHub[]>([]);
  const [unassignedProjects, setUnassignedProjects] = useState<Project[]>([]);
  const [allHubs, setAllHubs] = useState<ProjectHub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHierarchy = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('project_region')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (regionsError) throw regionsError;

      // Fetch all hubs first
      const { data: hubsData, error: hubsError } = await supabase
        .from('hubs')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (hubsError) throw hubsError;

      // Create a map of hub id to hub data for quick lookup
      const hubsMap = new Map<string, any>();
      (hubsData || []).forEach((h: any) => {
        hubsMap.set(h.id, h);
      });

      // Fetch hub-region assignments
      const { data: hubRegionData, error: hubRegionError } = await supabase
        .from('project_hub_region')
        .select('id, hub_id, region_id, display_order, created_at')
        .order('display_order');

      if (hubRegionError) throw hubRegionError;

      // Fetch all active projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_id_prefix, project_id_number, project_title, hub_id, plant_id, station_id')
        .eq('is_active', true)
        .order('project_id_prefix')
        .order('project_id_number');

      if (projectsError) throw projectsError;

      // Build hub-region map
      const hubRegionMap = new Map<string, { regionId: string; displayOrder: number }>();
      hubRegionData?.forEach((hr: any) => {
        hubRegionMap.set(hr.hub_id, {
          regionId: hr.region_id,
          displayOrder: hr.display_order
        });
      });

      // Build project list
      const projects: Project[] = (projectsData || []).map((p: any) => ({
        id: p.id,
        projectIdPrefix: p.project_id_prefix,
        projectIdNumber: p.project_id_number,
        projectTitle: p.project_title,
        hubId: p.hub_id,
        plantId: p.plant_id,
        stationId: p.station_id
      }));

      // Build all hubs list with region info
      const allHubsList: ProjectHub[] = (hubsData || []).map((h: any) => {
        const assignment = hubRegionMap.get(h.id);
        return {
          id: h.id,
          name: h.name,
          description: h.description,
          regionId: assignment?.regionId || '',
          displayOrder: assignment?.displayOrder || 0
        };
      });

      setAllHubs(allHubsList);

      // Find unassigned hubs (not in any region)
      const assignedHubIds = new Set(hubRegionData?.map((hr: any) => hr.hub_id) || []);
      const unassigned = allHubsList.filter(h => !assignedHubIds.has(h.id));
      setUnassignedHubs(unassigned);

      // Find unassigned projects (no hub)
      const unassignedProjs = projects.filter(p => !p.hubId);
      setUnassignedProjects(unassignedProjs);

      // Build regions with hubs
      const regionsWithHubs: RegionWithHubs[] = (regionsData || []).map(region => {
        // Get hubs assigned to this region
        const regionHubAssignments = hubRegionData?.filter((hr: any) => hr.region_id === region.id) || [];
        
        const hubs: HubWithProjects[] = regionHubAssignments
          .map((hr: any) => {
            const hub = hubsMap.get(hr.hub_id);
            if (!hub) return null; // Hub not found, skip
            
            const hubProjects = projects.filter(p => p.hubId === hr.hub_id);
            
            return {
              id: hub.id,
              name: hub.name,
              description: hub.description,
              regionId: region.id,
              displayOrder: hr.display_order,
              projects: hubProjects
            };
          })
          .filter((h): h is HubWithProjects => h !== null);

        return {
          ...region,
          hubs
        };
      });

      setRegions(regionsWithHubs);
    } catch (err: any) {
      console.error('Error fetching project hierarchy:', err);
      setError(err.message);
      toast.error('Failed to load project hierarchy');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  // Assign a hub to a region
  const assignHubToRegion = async (hubId: string, regionId: string) => {
    try {
      // Remove existing assignment if any
      await supabase
        .from('project_hub_region')
        .delete()
        .eq('hub_id', hubId);

      // Get max display order for the region
      const { data: maxOrder } = await supabase
        .from('project_hub_region')
        .select('display_order')
        .eq('region_id', regionId)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      // Create new assignment
      const { error } = await supabase
        .from('project_hub_region')
        .insert({
          hub_id: hubId,
          region_id: regionId,
          display_order: (maxOrder?.display_order || 0) + 1
        });

      if (error) throw error;

      toast.success('Hub assigned to region');
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Error assigning hub:', err);
      toast.error('Failed to assign hub');
    }
  };

  // Remove hub from region
  const removeHubFromRegion = async (hubId: string) => {
    try {
      const { error } = await supabase
        .from('project_hub_region')
        .delete()
        .eq('hub_id', hubId);

      if (error) throw error;

      toast.success('Hub removed from region');
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Error removing hub:', err);
      toast.error('Failed to remove hub');
    }
  };

  // Move project to a different hub
  const moveProjectToHub = async (projectId: string, newHubId: string | null) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ hub_id: newHubId })
        .eq('id', projectId);

      if (error) throw error;

      toast.success('Project moved');
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Error moving project:', err);
      toast.error('Failed to move project');
    }
  };

  // Add a new region
  const addRegion = async (name: string, description?: string) => {
    try {
      const { data: maxOrder } = await supabase
        .from('project_region')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      const { error } = await supabase
        .from('project_region')
        .insert({
          name,
          description,
          display_order: (maxOrder?.display_order || 0) + 1
        });

      if (error) throw error;

      toast.success('Region added');
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Error adding region:', err);
      toast.error('Failed to add region');
    }
  };

  // Update a region
  const updateRegion = async (regionId: string, updates: Partial<ProjectRegion>) => {
    try {
      const { error } = await supabase
        .from('project_region')
        .update(updates)
        .eq('id', regionId);

      if (error) throw error;

      toast.success('Region updated');
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Error updating region:', err);
      toast.error('Failed to update region');
    }
  };

  // Delete a region
  const deleteRegion = async (regionId: string) => {
    try {
      const { error } = await supabase
        .from('project_region')
        .delete()
        .eq('id', regionId);

      if (error) throw error;

      toast.success('Region deleted');
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Error deleting region:', err);
      toast.error('Failed to delete region');
    }
  };

  return {
    regions,
    unassignedHubs,
    unassignedProjects,
    allHubs,
    isLoading,
    error,
    refetch: fetchHierarchy,
    assignHubToRegion,
    removeHubFromRegion,
    moveProjectToHub,
    addRegion,
    updateRegion,
    deleteRegion
  };
}
