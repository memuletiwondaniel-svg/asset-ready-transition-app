import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Hub {
  id: string;
  name: string;
  description?: string;
}

export const useHubs = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching hubs:', error);
        throw error;
      }

      return data as Hub[];
    },
  });

  const createHub = async (hubName: string) => {
    try {
      const { data, error } = await supabase
        .from('hubs')
        .insert({
          name: hubName,
          description: '',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['hubs'] });
      
      toast({
        title: "Hub Added",
        description: `"${hubName}" has been added to the available hubs.`,
      });

      return data;
    } catch (err) {
      console.error('Error adding hub:', err);
      toast({
        title: "Error",
        description: "Failed to add new hub. Please try again.",
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateHub = async (hubId: string, updates: { name?: string; description?: string }) => {
    try {
      const { error } = await supabase
        .from('hubs')
        .update(updates)
        .eq('id', hubId);

      if (error) {
        throw error;
      }

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['hubs'] });
      queryClient.invalidateQueries({ queryKey: ['project-hierarchy'] });
      
      toast({
        title: "Hub Updated",
        description: "Hub has been updated successfully.",
      });
    } catch (err) {
      console.error('Error updating hub:', err);
      toast({
        title: "Error",
        description: "Failed to update hub. Please try again.",
        variant: "destructive"
      });
      throw err;
    }
  };

  return {
    ...query,
    createHub,
    updateHub
  };
};