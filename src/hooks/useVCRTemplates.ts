import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { PACCategory } from './useHandoverPrerequisites';

export interface VCRTemplate {
  id: string;
  summary: string;
  description: string | null;
  sample_evidence: string | null;
  delivering_party_role_id: string | null;
  receiving_party_role_id: string | null;
  category_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: PACCategory;
  delivering_role?: { id: string; name: string };
  receiving_role?: { id: string; name: string };
}

// VCR Templates Hook
export function useVCRTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['vcr-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vcr_templates')
        .select(`
          *,
          category:pac_prerequisite_categories(id, name, display_name, description, display_order, is_active),
          delivering_role:roles!vcr_templates_delivering_party_role_id_fkey(id, name),
          receiving_role:roles!vcr_templates_receiving_party_role_id_fkey(id, name)
        `)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as VCRTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Omit<VCRTemplate, 'id' | 'created_at' | 'updated_at' | 'category' | 'delivering_role' | 'receiving_role'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('vcr_templates')
        .insert({ ...template, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-templates'] });
      toast({ title: 'Success', description: 'VCR template created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VCRTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('vcr_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-templates'] });
      toast({ title: 'Success', description: 'VCR template updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vcr_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-templates'] });
      toast({ title: 'Success', description: 'VCR template deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    ...query,
    createTemplate: createMutation.mutate,
    updateTemplate: updateMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
