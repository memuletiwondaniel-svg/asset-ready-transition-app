import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VCRItem {
  id: string;
  category_id: string | null;
  vcr_item: string;
  topic: string | null;
  supporting_evidence: string | null;
  guidance_notes: string | null;
  delivering_party_role_id: string | null;
  approving_party_role_ids: string[] | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  category_code?: string;
  delivering_role_name?: string;
}

export interface VCRItemWithRoles extends VCRItem {
  approving_role_names?: string[];
}

export const useVCRItems = () => {
  return useQuery({
    queryKey: ['vcr-items'],
    queryFn: async () => {
      // Fetch items with category and delivering role joins
      const { data: items, error } = await supabase
        .from('vcr_items')
        .select(`
          *,
          vcr_item_categories!vcr_items_category_id_fkey (name, code),
          roles!vcr_items_delivering_party_role_id_fkey (name)
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Collect all unique approver role IDs
      const allApproverIds = new Set<string>();
      (items || []).forEach((item: any) => {
        (item.approving_party_role_ids || []).forEach((id: string) => allApproverIds.add(id));
      });

      // Fetch all approver role names in one query
      let roleMap: Record<string, string> = {};
      if (allApproverIds.size > 0) {
        const { data: roles } = await supabase
          .from('roles')
          .select('id, name')
          .in('id', Array.from(allApproverIds));
        if (roles) {
          roles.forEach(r => { roleMap[r.id] = r.name; });
        }
      }

      return (items || []).map((item: any) => ({
        id: item.id,
        category_id: item.category_id,
        vcr_item: item.vcr_item,
        topic: item.topic,
        supporting_evidence: item.supporting_evidence,
        guidance_notes: item.guidance_notes,
        delivering_party_role_id: item.delivering_party_role_id,
        approving_party_role_ids: item.approving_party_role_ids,
        display_order: item.display_order,
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at,
        category_name: item.vcr_item_categories?.name,
        category_code: item.vcr_item_categories?.code,
        delivering_role_name: item.roles?.name,
        approving_role_names: (item.approving_party_role_ids || []).map((id: string) => roleMap[id] || 'Unknown'),
      })) as VCRItemWithRoles[];
    },
  });
};

export const useCreateVCRItem = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      category_id: string;
      vcr_item: string;
      topic?: string | null;
      delivering_party_role_id?: string;
      approving_party_role_ids?: string[];
      supporting_evidence?: string;
      guidance_notes?: string;
    }) => {
      // Get next display_order
      const { data: existing } = await supabase
        .from('vcr_items')
        .select('display_order')
        .eq('category_id', data.category_id)
        .eq('is_active', true)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.display_order || 0) + 1;

      const { data: result, error } = await supabase
        .from('vcr_items')
        .insert([{
          ...data,
          display_order: nextOrder,
          delivering_party_role_id: data.delivering_party_role_id || null,
          approving_party_role_ids: data.approving_party_role_ids || null,
          supporting_evidence: data.supporting_evidence || null,
          guidance_notes: data.guidance_notes || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-items'] });
      toast({ title: 'Success', description: 'VCR item added successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add VCR item', variant: 'destructive' });
    },
  });
};

export const useUpdateVCRItem = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      category_id?: string;
      vcr_item?: string;
      topic?: string | null;
      delivering_party_role_id?: string | null;
      approving_party_role_ids?: string[] | null;
      supporting_evidence?: string | null;
      guidance_notes?: string | null;
    }) => {
      const { error } = await supabase
        .from('vcr_items')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-items'] });
      toast({ title: 'Success', description: 'VCR item updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update VCR item', variant: 'destructive' });
    },
  });
};

export const useDeleteVCRItem = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vcr_items')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-items'] });
      toast({ title: 'Success', description: 'VCR item removed' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove VCR item', variant: 'destructive' });
    },
  });
};
