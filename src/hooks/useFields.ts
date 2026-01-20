import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Field {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  plant_id?: string;
  created_at: string;
  updated_at: string;
}

export const useFields = (plantId?: string) => {
  const [fields, setFields] = useState<Field[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchFields = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('field')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setFields(data || []);
    } catch (err) {
      console.error('Error fetching fields:', err);
      setError('Failed to load fields');
    } finally {
      setIsLoading(false);
    }
  };

  const addField = async (fieldName: string, fieldPlantId?: string) => {
    try {
      const { data, error: insertError } = await supabase
        .from('field')
        .insert({
          name: fieldName,
          plant_id: fieldPlantId || plantId,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update local state
      if (data) {
        setFields(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        toast({
          title: "Field Added",
          description: `"${fieldName}" has been added to the available fields.`,
        });
        return data;
      }
    } catch (err) {
      console.error('Error adding field:', err);
      toast({
        title: "Error",
        description: "Failed to add new field. Please try again.",
        variant: "destructive"
      });
      throw err;
    }
  };

  // Filter fields by plant if plantId is provided
  const filteredFields = useMemo(() => {
    if (!plantId) return fields;
    return fields.filter(f => f.plant_id === plantId);
  }, [fields, plantId]);

  useEffect(() => {
    fetchFields();
  }, []);

  return {
    fields: filteredFields,
    allFields: fields,
    isLoading,
    error,
    fetchFields,
    addField,
    getFieldsByPlant: (pId: string) => fields.filter(f => f.plant_id === pId)
  };
};