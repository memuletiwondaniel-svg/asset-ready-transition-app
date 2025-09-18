import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define the ChecklistItem type to match the actual database structure but also keep
// backward-compatible aliases used across the app
export interface ChecklistItem {
  // DB columns
  unique_id: string;
  description: string;
  category: string;
  topic?: string | null;
  required_evidence?: string | null;
  responsible?: string | null;
  Approver?: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  category_ref_id?: string | null;
  sequence_number?: number | null;
  // Aliases used by UI components
  id: string; // alias of unique_id
  supporting_evidence?: string | null; // alias of required_evidence
  responsible_party?: string | null; // alias of responsible
  approving_authority?: string | null; // alias of Approver
}

export const useChecklistItems = () => {
  return useQuery({
    queryKey: ['checklist-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('sequence_number', { ascending: true });

      if (error) throw error;

      // Map DB rows to include backward-compatible aliases
      return (data || []).map((row: any) => ({
        ...row,
        id: row.unique_id,
        supporting_evidence: row.required_evidence ?? null,
        responsible_party: row.responsible ?? null,
        approving_authority: row.Approver ?? null,
      })) as ChecklistItem[];
    },
  });
};

export const useChecklistCategories = () => {
  return useQuery({
    queryKey: ['checklist-categories-from-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;
      
      const categories = [...new Set(data.map(item => item.category))];
      return categories.sort();
    },
  });
};

export const useChecklistTopicsFromItems = () => {
  return useQuery({
    queryKey: ['checklist-topics-from-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('topic')
        .eq('is_active', true);

      if (error) throw error;
      
      const uniqueTopics = [...new Set(data?.map(item => item.topic).filter(Boolean))];
      return uniqueTopics.sort();
    },
  });
};

export interface UpdateChecklistItemData {
  // Accept either new DB field names or old alias names
  description?: string;
  category?: string;
  topic?: string | null;
  required_evidence?: string | null;
  responsible?: string | null;
  Approver?: string | null;
  supporting_evidence?: string | null; // alias
  responsible_party?: string | null;   // alias
  approving_authority?: string | null; // alias
  is_active?: boolean;
}

export const useUpdateChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, updateData }: { itemId: string; updateData: UpdateChecklistItemData }) => {
      const { data: { session } } = await supabase.auth.getSession();

      // Map alias fields to DB column names
      const dbUpdate: any = { ...updateData };
      if (updateData.supporting_evidence !== undefined) dbUpdate.required_evidence = updateData.supporting_evidence;
      if (updateData.responsible_party !== undefined) dbUpdate.responsible = updateData.responsible_party;
      if (updateData.approving_authority !== undefined) dbUpdate.Approver = updateData.approving_authority;
      delete dbUpdate.supporting_evidence;
      delete dbUpdate.responsible_party;
      delete dbUpdate.approving_authority;

      const { data, error } = await supabase
        .from('checklist_items')
        .update({
          ...dbUpdate,
          // Only set updated_by if user is authenticated
          ...(session?.user && { updated_by: session.user.id }),
          updated_at: new Date().toISOString(),
        })
        .eq('unique_id', itemId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error(`Checklist item with ID "${itemId}" not found`);
      }
      
      // Return mapped item to keep aliases consistent in UI
      return {
        ...data,
        id: data.unique_id,
        supporting_evidence: data.required_evidence ?? null,
        responsible_party: data.responsible ?? null,
        approving_authority: data.Approver ?? null,
      } as ChecklistItem;
    },
    onSuccess: (updatedItem) => {
      console.log('Update successful, updating cache and invalidating queries...', updatedItem);
      
      // Update the cache with the new item data
      queryClient.setQueryData<ChecklistItem[] | undefined>(['checklist-items'], (prev) => {
        if (!prev) return prev;
        return prev.map((item) => (item.unique_id === updatedItem.unique_id ? (updatedItem as ChecklistItem) : item));
      });
      
      // Invalidate all related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-topics'] });
      
      // Also force refetch to make sure cards view gets updated
      queryClient.refetchQueries({ queryKey: ['checklist-items'] });
    },
  });
};

export interface CreateChecklistItemData {
  description: string;
  category: string;
  topic?: string | null;
  required_evidence?: string | null;
  responsible?: string | null;
  Approver?: string | null;
  supporting_evidence?: string | null; // alias
  responsible_party?: string | null;   // alias
  approving_authority?: string | null; // alias
}

export const useCreateChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemData: CreateChecklistItemData) => {
      const { data: { session } } = await supabase.auth.getSession();

      // Map aliases to DB columns
      const dbInsert: any = { ...itemData };
      if (itemData.supporting_evidence !== undefined) dbInsert.required_evidence = itemData.supporting_evidence;
      if (itemData.responsible_party !== undefined) dbInsert.responsible = itemData.responsible_party;
      if (itemData.approving_authority !== undefined) dbInsert.Approver = itemData.approving_authority;
      delete dbInsert.supporting_evidence;
      delete dbInsert.responsible_party;
      delete dbInsert.approving_authority;

      const { data, error } = await supabase
        .from('checklist_items')
        .insert({
          ...dbInsert,
          // Only set created_by if user is authenticated
          ...(session?.user && { created_by: session.user.id }),
        })
        .select()
        .single();

      if (error) throw error;
      // Return mapped item
      return {
        ...data,
        id: data.unique_id,
        supporting_evidence: data.required_evidence ?? null,
        responsible_party: data.responsible ?? null,
        approving_authority: data.Approver ?? null,
      } as ChecklistItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
    },
  });
};

export const useDeleteChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      console.log('Attempting to delete checklist item via RPC:', itemId);

      // Use a SECURITY DEFINER RPC to bypass RLS and resequence items
      const { error } = await supabase.rpc('soft_delete_checklist_item', { p_unique_id: itemId });

      if (error) {
        console.error('Supabase RPC error during deletion:', error);
        throw error;
      }
      
      console.log('RPC deletion successful.');
      return itemId;
    },
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: ['checklist-items'] });
      const previousItems = queryClient.getQueryData<ChecklistItem[]>(['checklist-items']);
      if (previousItems) {
        queryClient.setQueryData<ChecklistItem[]>(['checklist-items'], previousItems.filter(i => i.unique_id !== itemId));
      }
      return { previousItems };
    },
    onError: (err, _itemId, context) => {
      console.error('Deletion mutation error:', err);
      if (context?.previousItems) {
        queryClient.setQueryData(['checklist-items'], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
    },
  });
};