import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VCRItemCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useVCRItemCategories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['vcr-item-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vcr_item_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as VCRItemCategory[];
    },
  });

  const addCategory = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      // Auto-generate code from first letters of each word, uppercase
      const words = name.trim().split(/\s+/);
      let code = words.map(w => w[0]?.toUpperCase() || '').join('');
      
      // If single word, take first 2 chars
      if (words.length === 1) {
        code = name.slice(0, 2).toUpperCase();
      }

      // Get next display_order
      const { data: existing } = await supabase
        .from('vcr_item_categories')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);
      
      const nextOrder = (existing?.[0]?.display_order || 0) + 1;

      const { data, error } = await supabase
        .from('vcr_item_categories')
        .insert([{ code, name, description: description || null, display_order: nextOrder }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-item-categories'] });
      toast({ title: 'Success', description: 'VCR Item Category added successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message?.includes('duplicate') 
          ? 'A category with this code already exists' 
          : 'Failed to add category',
        variant: 'destructive',
      });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase
        .from('vcr_item_categories')
        .update({ name, description: description || null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-item-categories'] });
      toast({ title: 'Success', description: 'Category updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vcr_item_categories')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-item-categories'] });
      toast({ title: 'Success', description: 'Category removed' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove category', variant: 'destructive' });
    },
  });

  return {
    ...query,
    addCategory,
    updateCategory,
    deleteCategory,
  };
};
