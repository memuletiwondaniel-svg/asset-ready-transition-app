import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ORAPlanTemplate {
  id: string;
  name: string;
  description: string | null;
  project_type: string;
  complexity: 'low' | 'medium' | 'high';
  applicable_phases: string[];
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ORAPlanTemplateInput {
  name: string;
  description?: string;
  project_type: string;
  complexity?: 'low' | 'medium' | 'high';
  applicable_phases?: string[];
  is_active?: boolean;
  is_default?: boolean;
}

export const useORAPlanTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['ora-plan-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ora_plan_templates')
        .select('*')
        .order('project_type')
        .order('name');

      if (error) throw error;
      return data as ORAPlanTemplate[];
    }
  });

  const createTemplate = useMutation({
    mutationFn: async (input: ORAPlanTemplateInput) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('ora_plan_templates')
        .insert({
          ...input,
          created_by: user.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data as ORAPlanTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-plan-templates'] });
      toast({ title: 'Success', description: 'Template created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...input }: ORAPlanTemplateInput & { id: string }) => {
      const { data, error } = await supabase
        .from('ora_plan_templates')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ORAPlanTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-plan-templates'] });
      toast({ title: 'Success', description: 'Template updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ora_plan_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-plan-templates'] });
      toast({ title: 'Success', description: 'Template deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    templates: templates || [],
    isLoading,
    createTemplate: createTemplate.mutateAsync,
    updateTemplate: updateTemplate.mutateAsync,
    deleteTemplate: deleteTemplate.mutateAsync,
    isCreating: createTemplate.isPending,
    isUpdating: updateTemplate.isPending,
    isDeleting: deleteTemplate.isPending
  };
};

export const PROJECT_TYPES = [
  { value: 'Greenfield', label: 'Greenfield' },
  { value: 'Brownfield', label: 'Brownfield' },
  { value: 'Modification', label: 'Modification' },
  { value: 'Tie-in', label: 'Tie-in' },
  { value: 'Expansion', label: 'Expansion' },
  { value: 'Decommissioning', label: 'Decommissioning' }
] as const;

export const COMPLEXITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700 border-red-200' }
] as const;
