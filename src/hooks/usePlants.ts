import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Plant {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePlants = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPlants = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('plant')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setPlants(data || []);
    } catch (err) {
      console.error('Error fetching plants:', err);
      setError('Failed to load plants');
    } finally {
      setIsLoading(false);
    }
  };

  const addPlant = async (plantName: string) => {
    try {
      const { data, error: insertError } = await supabase
        .from('plant')
        .insert({
          name: plantName,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update local state
      if (data) {
        setPlants(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        toast({
          title: "Plant Added",
          description: `"${plantName}" has been added to the available plants.`,
        });
        return data;
      }
    } catch (err) {
      console.error('Error adding plant:', err);
      toast({
        title: "Error",
        description: "Failed to add new plant. Please try again.",
        variant: "destructive"
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  return {
    plants,
    isLoading,
    error,
    fetchPlants,
    addPlant,
    createPlant: addPlant
  };
};