import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Commission {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCommissions = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCommissions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('commission')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setCommissions(data || []);
    } catch (err) {
      console.error('Error fetching commissions:', err);
      setError('Failed to load commissions');
    } finally {
      setIsLoading(false);
    }
  };

  const addCommission = async (commissionName: string) => {
    try {
      const { data, error: insertError } = await supabase
        .from('commission')
        .insert({
          name: commissionName,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update local state
      if (data) {
        setCommissions(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        toast({
          title: "Commission Added",
          description: `"${commissionName}" has been added to the available commissions.`,
        });
        return data;
      }
    } catch (err) {
      console.error('Error adding commission:', err);
      toast({
        title: "Error",
        description: "Failed to add new commission. Please try again.",
        variant: "destructive"
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  return {
    commissions,
    isLoading,
    error,
    fetchCommissions,
    addCommission
  };
};