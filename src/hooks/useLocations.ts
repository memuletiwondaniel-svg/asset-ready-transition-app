import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Plant {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Field {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  plant_id: string | null;
  created_at: string;
  updated_at: string;
  plant?: Plant;
}

export interface Station {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  field_id: string | null;
  created_at: string;
  updated_at: string;
  field?: Field;
}

export const useLocations = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlants = async () => {
    const { data, error } = await supabase
      .from('plant')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (error) {
      console.error('Error fetching plants:', error);
      setError(error.message);
    } else {
      setPlants(data || []);
    }
  };

  const fetchFields = async () => {
    const { data, error } = await supabase
      .from('field')
      .select('*, plant:plant_id(*)')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching fields:', error);
      setError(error.message);
    } else {
      setFields(data || []);
    }
  };

  const fetchStations = async () => {
    const { data, error } = await supabase
      .from('station')
      .select('*, field:field_id(*)')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching stations:', error);
      setError(error.message);
    } else {
      setStations(data || []);
    }
  };

  const fetchAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchPlants(), fetchFields(), fetchStations()]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Plant CRUD operations
  const addPlant = async (name: string, description?: string) => {
    const { data, error } = await supabase
      .from('plant')
      .insert({ name, description, is_active: true })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add plant', variant: 'destructive' });
      return null;
    }
    toast({ title: 'Success', description: 'Plant added successfully' });
    await fetchPlants();
    return data;
  };

  const updatePlant = async (id: string, updates: Partial<Pick<Plant, 'name' | 'description'>>) => {
    const { error } = await supabase
      .from('plant')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update plant', variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Plant updated successfully' });
    await fetchPlants();
    return true;
  };

  const deletePlant = async (id: string) => {
    // Check if plant has linked fields
    const linkedFields = fields.filter(f => f.plant_id === id);
    if (linkedFields.length > 0) {
      toast({ 
        title: 'Cannot Delete', 
        description: `This plant has ${linkedFields.length} linked field(s). Remove them first.`, 
        variant: 'destructive' 
      });
      return false;
    }

    const { error } = await supabase
      .from('plant')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete plant', variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Plant deleted successfully' });
    await fetchPlants();
    return true;
  };

  // Field CRUD operations
  const addField = async (name: string, plantId?: string, description?: string) => {
    const { data, error } = await supabase
      .from('field')
      .insert({ name, plant_id: plantId || null, description, is_active: true })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add field', variant: 'destructive' });
      return null;
    }
    toast({ title: 'Success', description: 'Field added successfully' });
    await fetchFields();
    return data;
  };

  const updateField = async (id: string, updates: Partial<Pick<Field, 'name' | 'description' | 'plant_id'>>) => {
    const { error } = await supabase
      .from('field')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update field', variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Field updated successfully' });
    await fetchFields();
    return true;
  };

  const deleteField = async (id: string) => {
    // Check if field has linked stations
    const linkedStations = stations.filter(s => s.field_id === id);
    if (linkedStations.length > 0) {
      toast({ 
        title: 'Cannot Delete', 
        description: `This field has ${linkedStations.length} linked station(s). Remove them first.`, 
        variant: 'destructive' 
      });
      return false;
    }

    const { error } = await supabase
      .from('field')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete field', variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Field deleted successfully' });
    await fetchFields();
    return true;
  };

  // Station CRUD operations
  const addStation = async (name: string, fieldId?: string, description?: string) => {
    const { data, error } = await supabase
      .from('station')
      .insert({ name, field_id: fieldId || null, description, is_active: true })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add station', variant: 'destructive' });
      return null;
    }
    toast({ title: 'Success', description: 'Station added successfully' });
    await fetchStations();
    return data;
  };

  const updateStation = async (id: string, updates: Partial<Pick<Station, 'name' | 'description' | 'field_id'>>) => {
    const { error } = await supabase
      .from('station')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update station', variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Station updated successfully' });
    await fetchStations();
    return true;
  };

  const deleteStation = async (id: string) => {
    const { error } = await supabase
      .from('station')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete station', variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Station deleted successfully' });
    await fetchStations();
    return true;
  };

  // Get filtered data
  const getFieldsByPlant = (plantId: string) => fields.filter(f => f.plant_id === plantId);
  const getStationsByField = (fieldId: string) => stations.filter(s => s.field_id === fieldId);

  return {
    plants,
    fields,
    stations,
    isLoading,
    error,
    refetch: fetchAll,
    // Plant operations
    addPlant,
    updatePlant,
    deletePlant,
    // Field operations
    addField,
    updateField,
    deleteField,
    getFieldsByPlant,
    // Station operations
    addStation,
    updateStation,
    deleteStation,
    getStationsByField,
  };
};
