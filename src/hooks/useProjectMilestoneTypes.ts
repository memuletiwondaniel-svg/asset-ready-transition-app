import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectMilestoneType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useProjectMilestoneTypes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: milestoneTypes, isLoading } = useQuery({
    queryKey: ['project-milestone-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestone_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as ProjectMilestoneType[];
    }
  });

  const createMilestoneType = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const code = `CUSTOM_${Date.now()}`;
      
      const { data: result, error } = await supabase
        .from('project_milestone_types')
        .insert({
          code,
          name: input.name,
          description: input.description || null,
          is_custom: true,
          created_by: user.user.id,
          display_order: 999
        })
        .select()
        .single();

      if (error) throw error;
      return result as ProjectMilestoneType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestone-types'] });
      toast({
        title: 'Success',
        description: 'Custom milestone type created'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    milestoneTypes: milestoneTypes || [],
    isLoading,
    createMilestoneType: createMilestoneType.mutateAsync,
    isCreating: createMilestoneType.isPending
  };
};
