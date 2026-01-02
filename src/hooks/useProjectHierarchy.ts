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

export interface RegionPlant {
  id: string;
  region_id: string;
  plant_id: string;
  plant_name: string;
  created_at: string;
}

export interface RegionStation {
  id: string;
  region_id: string;
  station_id: string;
  station_name: string;
  field_name: string;
  plant_name: string;
  created_at: string;
}

export interface PlantWithHierarchy {
  id: string;
  name: string;
  fields: {
    id: string;
    name: string;
    stations: {
      id: string;
      name: string;
      hasOverride: boolean;
      overrideRegionId?: string;
      overrideRegionName?: string;
    }[];
  }[];
}

export interface RegionWithPlants extends ProjectRegion {
  plants: PlantWithHierarchy[];
  stationOverrides: RegionStation[];
}

export function useProjectHierarchy() {
  const [regions, setRegions] = useState<RegionWithPlants[]>([]);
  const [unassignedPlants, setUnassignedPlants] = useState<PlantWithHierarchy[]>([]);
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

      // Fetch region-plant assignments
      const { data: regionPlantsData, error: regionPlantsError } = await supabase
        .from('project_region_plant')
        .select(`
          id,
          region_id,
          plant_id,
          created_at,
          plant:plant_id (name)
        `);

      if (regionPlantsError) throw regionPlantsError;

      // Fetch station overrides
      const { data: stationOverridesData, error: stationOverridesError } = await supabase
        .from('project_region_station')
        .select(`
          id,
          region_id,
          station_id,
          created_at,
          station:station_id (
            name,
            field:field_id (
              name,
              plant:plant_id (name)
            )
          )
        `);

      if (stationOverridesError) throw stationOverridesError;

      // Fetch all plants with their hierarchy
      const { data: plantsData, error: plantsError } = await supabase
        .from('plant')
        .select(`
          id,
          name,
          display_order
        `)
        .eq('is_active', true)
        .order('display_order');

      if (plantsError) throw plantsError;

      // Fetch all fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('field')
        .select('id, name, plant_id')
        .eq('is_active', true);

      if (fieldsError) throw fieldsError;

      // Fetch all stations
      const { data: stationsData, error: stationsError } = await supabase
        .from('station')
        .select('id, name, field_id')
        .eq('is_active', true);

      if (stationsError) throw stationsError;

      // Build station overrides map
      const stationOverrideMap = new Map<string, { regionId: string; regionName: string }>();
      stationOverridesData?.forEach((override: any) => {
        const region = regionsData?.find(r => r.id === override.region_id);
        if (region) {
          stationOverrideMap.set(override.station_id, {
            regionId: override.region_id,
            regionName: region.name
          });
        }
      });

      // Build plants with hierarchy
      const buildPlantHierarchy = (plant: any): PlantWithHierarchy => {
        const plantFields = fieldsData?.filter(f => f.plant_id === plant.id) || [];
        return {
          id: plant.id,
          name: plant.name,
          fields: plantFields.map(field => {
            const fieldStations = stationsData?.filter(s => s.field_id === field.id) || [];
            return {
              id: field.id,
              name: field.name,
              stations: fieldStations.map(station => {
                const override = stationOverrideMap.get(station.id);
                return {
                  id: station.id,
                  name: station.name,
                  hasOverride: !!override,
                  overrideRegionId: override?.regionId,
                  overrideRegionName: override?.regionName
                };
              })
            };
          })
        };
      };

      // Build region plant map
      const regionPlantMap = new Map<string, string[]>();
      regionPlantsData?.forEach((rp: any) => {
        const existing = regionPlantMap.get(rp.region_id) || [];
        existing.push(rp.plant_id);
        regionPlantMap.set(rp.region_id, existing);
      });

      // Build assigned plant IDs set
      const assignedPlantIds = new Set<string>();
      regionPlantsData?.forEach((rp: any) => assignedPlantIds.add(rp.plant_id));

      // Build regions with plants
      const regionsWithPlants: RegionWithPlants[] = (regionsData || []).map(region => {
        const plantIds = regionPlantMap.get(region.id) || [];
        const plants = plantIds
          .map(plantId => plantsData?.find(p => p.id === plantId))
          .filter(Boolean)
          .map(plant => buildPlantHierarchy(plant));

        const stationOverrides: RegionStation[] = (stationOverridesData || [])
          .filter((so: any) => so.region_id === region.id)
          .map((so: any) => ({
            id: so.id,
            region_id: so.region_id,
            station_id: so.station_id,
            station_name: so.station?.name || '',
            field_name: so.station?.field?.name || '',
            plant_name: so.station?.field?.plant?.name || '',
            created_at: so.created_at
          }));

        return {
          ...region,
          plants,
          stationOverrides
        };
      });

      // Build unassigned plants
      const unassigned = (plantsData || [])
        .filter(plant => !assignedPlantIds.has(plant.id))
        .map(plant => buildPlantHierarchy(plant));

      setRegions(regionsWithPlants);
      setUnassignedPlants(unassigned);
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

  const assignPlantToRegion = async (plantId: string, regionId: string) => {
    try {
      // Remove existing assignment if any
      await supabase
        .from('project_region_plant')
        .delete()
        .eq('plant_id', plantId);

      // Create new assignment
      const { error } = await supabase
        .from('project_region_plant')
        .insert({ plant_id: plantId, region_id: regionId });

      if (error) throw error;

      toast.success('Plant assigned to region');
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Error assigning plant:', err);
      toast.error('Failed to assign plant');
    }
  };

  const removePlantFromRegion = async (plantId: string) => {
    try {
      const { error } = await supabase
        .from('project_region_plant')
        .delete()
        .eq('plant_id', plantId);

      if (error) throw error;

      toast.success('Plant removed from region');
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Error removing plant:', err);
      toast.error('Failed to remove plant');
    }
  };

  const addStationOverride = async (stationId: string, regionId: string) => {
    try {
      // Remove existing override if any
      await supabase
        .from('project_region_station')
        .delete()
        .eq('station_id', stationId);

      // Create new override
      const { error } = await supabase
        .from('project_region_station')
        .insert({ station_id: stationId, region_id: regionId });

      if (error) throw error;

      toast.success('Station override added');
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Error adding station override:', err);
      toast.error('Failed to add station override');
    }
  };

  const removeStationOverride = async (stationId: string) => {
    try {
      const { error } = await supabase
        .from('project_region_station')
        .delete()
        .eq('station_id', stationId);

      if (error) throw error;

      toast.success('Station override removed');
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Error removing station override:', err);
      toast.error('Failed to remove station override');
    }
  };

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
    unassignedPlants,
    isLoading,
    error,
    refetch: fetchHierarchy,
    assignPlantToRegion,
    removePlantFromRegion,
    addStationOverride,
    removeStationOverride,
    addRegion,
    updateRegion,
    deleteRegion
  };
}
