import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Field {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useFields = () => {
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

  const addField = async (fieldName: string) => {
    try {
      const { data, error: insertError } = await supabase
        .from('field')
        .insert({
          name: fieldName,
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

  useEffect(() => {
    fetchFields();
  }, []);

  return {
    fields,
    isLoading,
    error,
    fetchFields,
    addField
  };
};