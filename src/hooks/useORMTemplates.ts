import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useORMTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['orm-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orm_deliverable_templates')
        .select(`
          *,
          tasks:orm_template_tasks(*),
          checklists:orm_template_checklists(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createTemplate = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      deliverable_type: string;
      estimated_hours?: number;
      tasks?: Array<{
        title: string;
        description?: string;
        priority: 'LOW' | 'MEDIUM' | 'HIGH';
        estimated_days?: number;
        sequence_order: number;
      }>;
      checklists?: Array<{
        document_name: string;
        document_type: string;
        is_mandatory: boolean;
        sequence_order: number;
      }>;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('orm_deliverable_templates')
        .insert({
          name: data.name,
          description: data.description,
          deliverable_type: data.deliverable_type as any,
          estimated_hours: data.estimated_hours,
          created_by: user.user.id
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create tasks if provided
      if (data.tasks && data.tasks.length > 0) {
        const { error: tasksError } = await supabase
          .from('orm_template_tasks')
          .insert(
            data.tasks.map(task => ({
              template_id: template.id,
              ...task
            }))
          );

        if (tasksError) throw tasksError;
      }

      // Create checklists if provided
      if (data.checklists && data.checklists.length > 0) {
        const { error: checklistsError } = await supabase
          .from('orm_template_checklists')
          .insert(
            data.checklists.map(checklist => ({
              template_id: template.id,
              ...checklist
            }))
          );

        if (checklistsError) throw checklistsError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-templates'] });
      toast({
        title: 'Success',
        description: 'Template created successfully'
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

  const applyTemplate = useMutation({
    mutationFn: async (data: {
      template_id: string;
      deliverable_id: string;
    }) => {
      // Get template with tasks and checklists
      const { data: template, error: templateError } = await supabase
        .from('orm_deliverable_templates')
        .select(`
          *,
          tasks:orm_template_tasks(*),
          checklists:orm_template_checklists(*)
        `)
        .eq('id', data.template_id)
        .single();

      if (templateError) throw templateError;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get deliverable to find assigned resource
      const { data: deliverable } = await supabase
        .from('orm_deliverables')
        .select('assigned_resource_id')
        .eq('id', data.deliverable_id)
        .single();

      // Create tasks from template
      if (template.tasks && template.tasks.length > 0) {
        const { error: tasksError } = await supabase
          .from('orm_tasks')
          .insert(
            (template.tasks as any[]).map((task: any) => ({
              deliverable_id: data.deliverable_id,
              title: task.title,
              description: task.description,
              priority: task.priority,
              assigned_to: deliverable?.assigned_resource_id || user.user!.id,
              created_by: user.user!.id,
              status: 'PENDING'
            }))
          );

        if (tasksError) throw tasksError;
      }

      // Create checklists from template
      if (template.checklists && template.checklists.length > 0) {
        const { error: checklistsError } = await supabase
          .from('orm_document_checklist')
          .insert(
            (template.checklists as any[]).map((checklist: any) => ({
              deliverable_id: data.deliverable_id,
              document_name: checklist.document_name,
              document_type: checklist.document_type,
              is_mandatory: checklist.is_mandatory
            }))
          );

        if (checklistsError) throw checklistsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['orm-plans'] });
      toast({
        title: 'Success',
        description: 'Template applied successfully'
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
    templates,
    isLoading,
    createTemplate: createTemplate.mutate,
    applyTemplate: applyTemplate.mutate,
    isCreating: createTemplate.isPending,
    isApplying: applyTemplate.isPending
  };
};
