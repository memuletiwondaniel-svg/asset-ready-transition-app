import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChecklistItemDiscipline {
  id: string;
  checklist_item_id: string;
  discipline_id: string;
  created_at: string;
  updated_at: string;
}

export interface DisciplineWithName {
  id: string;
  name: string;
}

export const useChecklistItemDisciplines = () => {
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ['checklist-item-disciplines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_item_approving_disciplines')
        .select(`
          id,
          checklist_item_id,
          discipline_id,
          created_at,
          updated_at,
          discipline:discipline_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as (ChecklistItemDiscipline & { discipline: DisciplineWithName })[];
    },
  });

  // Get disciplines for a specific checklist item
  const getDisciplinesForItem = (checklistItemId: string) => {
    return assignments
      .filter(a => a.checklist_item_id === checklistItemId)
      .map(a => ({
        id: a.discipline_id,
        name: a.discipline?.name || '',
      }));
  };

  // Get all items for a specific discipline
  const getItemsForDiscipline = (disciplineId: string) => {
    return assignments
      .filter(a => a.discipline_id === disciplineId)
      .map(a => a.checklist_item_id);
  };

  // Assign disciplines to a checklist item (replaces existing)
  const assignDisciplines = useMutation({
    mutationFn: async ({ 
      checklistItemId, 
      disciplineIds 
    }: { 
      checklistItemId: string; 
      disciplineIds: string[] 
    }) => {
      // First, remove existing assignments
      const { error: deleteError } = await supabase
        .from('checklist_item_approving_disciplines')
        .delete()
        .eq('checklist_item_id', checklistItemId);

      if (deleteError) throw deleteError;

      // Then add new assignments
      if (disciplineIds.length > 0) {
        const { error: insertError } = await supabase
          .from('checklist_item_approving_disciplines')
          .insert(
            disciplineIds.map(disciplineId => ({
              checklist_item_id: checklistItemId,
              discipline_id: disciplineId,
            }))
          );

        if (insertError) throw insertError;
      }

      return { checklistItemId, disciplineIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-item-disciplines'] });
      toast.success('Approving disciplines updated');
    },
    onError: (error: any) => {
      console.error('Error assigning disciplines:', error);
      toast.error(error.message || 'Failed to update disciplines');
    },
  });

  // Bulk assign disciplines to multiple items
  const bulkAssignDisciplines = useMutation({
    mutationFn: async (assignments: { checklistItemId: string; disciplineIds: string[] }[]) => {
      for (const assignment of assignments) {
        // Delete existing
        const { error: deleteError } = await supabase
          .from('checklist_item_approving_disciplines')
          .delete()
          .eq('checklist_item_id', assignment.checklistItemId);

        if (deleteError) throw deleteError;

        // Insert new
        if (assignment.disciplineIds.length > 0) {
          const { error: insertError } = await supabase
            .from('checklist_item_approving_disciplines')
            .insert(
              assignment.disciplineIds.map(disciplineId => ({
                checklist_item_id: assignment.checklistItemId,
                discipline_id: disciplineId,
              }))
            );

          if (insertError) throw insertError;
        }
      }
      return assignments;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-item-disciplines'] });
      toast.success('Bulk disciplines update completed');
    },
    onError: (error: any) => {
      console.error('Error bulk assigning disciplines:', error);
      toast.error(error.message || 'Failed to bulk update disciplines');
    },
  });

  return {
    assignments,
    isLoading,
    error,
    getDisciplinesForItem,
    getItemsForDiscipline,
    assignDisciplines,
    bulkAssignDisciplines,
  };
};
