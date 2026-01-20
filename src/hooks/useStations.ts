import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Station {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hierarchyLabel?: string;
  plant_name?: string;
  field_name?: string;
}

export const useStations = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('station')
        .select(`
          *,
          field:field_id (
            name,
            plant:plant_id (
              name
            )
          )
        `)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // Map stations with hierarchy labels
      const stationsWithHierarchy = (data || []).map((station: any) => {
        const plantName = station.field?.plant?.name;
        const hierarchyLabel = plantName ? `${plantName} > ${station.name}` : undefined;
        return {
          id: station.id,
          name: station.name,
          description: station.description,
          is_active: station.is_active,
          created_at: station.created_at,
          updated_at: station.updated_at,
          hierarchyLabel,
          plant_name: plantName,
          field_name: station.field?.name
        };
      });

      setStations(stationsWithHierarchy);
    } catch (err) {
      console.error('Error fetching stations:', err);
      setError('Failed to load stations');
    } finally {
      setIsLoading(false);
    }
  };

  const addStation = async (stationName: string) => {
    try {
      const { data, error: insertError } = await supabase
        .from('station')
        .insert({
          name: stationName,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update local state
      if (data) {
        setStations(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        toast({
          title: "Station Added",
          description: `"${stationName}" has been added to the available stations.`,
        });
        return data;
      }
    } catch (err) {
      console.error('Error adding station:', err);
      toast({
        title: "Error",
        description: "Failed to add new station. Please try again.",
        variant: "destructive"
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  return {
    stations,
    isLoading,
    error,
    fetchStations,
    addStation,
    createStation: addStation
  };
};