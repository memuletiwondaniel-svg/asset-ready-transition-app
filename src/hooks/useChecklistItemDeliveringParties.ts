import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChecklistItemDeliveringParty {
  id: string;
  checklist_item_id: string;
  position_id: string;
  created_at: string;
  updated_at: string;
}

export interface PositionWithName {
  id: string;
  name: string;
  department: string | null;
}

export const useChecklistItemDeliveringParties = () => {
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ['checklist-item-delivering-parties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_item_delivering_parties')
        .select(`
          id,
          checklist_item_id,
          position_id,
          created_at,
          updated_at,
          position:position_id (
            id,
            name,
            department
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as (ChecklistItemDeliveringParty & { position: PositionWithName })[];
    },
  });

  // Get delivering party for a specific checklist item
  const getDeliveringPartyForItem = (checklistItemId: string) => {
    const assignment = assignments.find(a => a.checklist_item_id === checklistItemId);
    if (!assignment) return null;
    return {
      id: assignment.position_id,
      name: assignment.position?.name || '',
      department: assignment.position?.department || null,
    };
  };

  // Get all items for a specific position
  const getItemsForPosition = (positionId: string) => {
    return assignments
      .filter(a => a.position_id === positionId)
      .map(a => a.checklist_item_id);
  };

  // Assign delivering party to a checklist item (replaces existing)
  const assignDeliveringParty = useMutation({
    mutationFn: async ({ 
      checklistItemId, 
      positionId 
    }: { 
      checklistItemId: string; 
      positionId: string | null 
    }) => {
      // First, remove existing assignment
      const { error: deleteError } = await supabase
        .from('checklist_item_delivering_parties')
        .delete()
        .eq('checklist_item_id', checklistItemId);

      if (deleteError) throw deleteError;

      // Then add new assignment if provided
      if (positionId) {
        const { error: insertError } = await supabase
          .from('checklist_item_delivering_parties')
          .insert({
            checklist_item_id: checklistItemId,
            position_id: positionId,
          });

        if (insertError) throw insertError;
      }

      return { checklistItemId, positionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-item-delivering-parties'] });
      toast.success('Delivering party updated');
    },
    onError: (error: any) => {
      console.error('Error assigning delivering party:', error);
      toast.error(error.message || 'Failed to update delivering party');
    },
  });

  // Bulk assign delivering parties to multiple items
  const bulkAssignDeliveringParties = useMutation({
    mutationFn: async (assignments: { checklistItemId: string; positionId: string | null }[]) => {
      for (const assignment of assignments) {
        // Delete existing
        const { error: deleteError } = await supabase
          .from('checklist_item_delivering_parties')
          .delete()
          .eq('checklist_item_id', assignment.checklistItemId);

        if (deleteError) throw deleteError;

        // Insert new if provided
        if (assignment.positionId) {
          const { error: insertError } = await supabase
            .from('checklist_item_delivering_parties')
            .insert({
              checklist_item_id: assignment.checklistItemId,
              position_id: assignment.positionId,
            });

          if (insertError) throw insertError;
        }
      }
      return assignments;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-item-delivering-parties'] });
      toast.success('Bulk delivering parties update completed');
    },
    onError: (error: any) => {
      console.error('Error bulk assigning delivering parties:', error);
      toast.error(error.message || 'Failed to bulk update delivering parties');
    },
  });

  return {
    assignments,
    isLoading,
    error,
    getDeliveringPartyForItem,
    getItemsForPosition,
    assignDeliveringParty,
    bulkAssignDeliveringParties,
  };
};
