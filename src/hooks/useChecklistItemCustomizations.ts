import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChecklistItemCustomization {
  id: string;
  checklist_id: string;
  item_unique_id: string;
  custom_description?: string;
  custom_responsible?: string;
  custom_approver?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useChecklistItemCustomizations = (checklistId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customizations = [], isLoading } = useQuery({
    queryKey: ['checklist-item-customizations', checklistId],
    queryFn: async () => {
      if (!checklistId) return [];
      
      const { data, error } = await supabase
        .from('checklist_item_customizations' as any)
        .select('*')
        .eq('checklist_id', checklistId);

      if (error) throw error;
      return (data as any[]) as ChecklistItemCustomization[];
    },
    enabled: !!checklistId,
  });

  const upsertCustomization = useMutation({
    mutationFn: async (customization: Partial<ChecklistItemCustomization>) => {
      const { data, error} = await supabase
        .from('checklist_item_customizations' as any)
        .upsert(customization)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-item-customizations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    customizations,
    isLoading,
    upsertCustomization,
  };
};
