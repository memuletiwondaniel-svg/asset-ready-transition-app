import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ORPTemplate {
  id: string;
  name: string;
  description?: string;
  project_type: 'brownfield' | 'greenfield' | 'expansion';
  phase: 'ASSESS_SELECT' | 'DEFINE' | 'EXECUTE';
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ORPTemplateDeliverable {
  id: string;
  template_id: string;
  deliverable_id: string;
  estimated_manhours?: number;
  display_order: number;
  is_required: boolean;
  deliverable?: {
    name: string;
    description?: string;
  };
}

export interface ORPTemplateApproval {
  id: string;
  template_id: string;
  approver_role: string;
  display_order: number;
}

export const useORPTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['orp-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ORPTemplate[];
    }
  });

  const getTemplateDetails = async (templateId: string) => {
    // Fetch deliverables
    const { data: deliverables, error: delError } = await supabase
      .from('orp_template_deliverables')
      .select(`
        *,
        deliverable:orp_deliverables_catalog(name, description)
      `)
      .eq('template_id', templateId)
      .order('display_order');

    if (delError) throw delError;

    // Fetch approvals
    const { data: approvals, error: appError } = await supabase
      .from('orp_template_approvals')
      .select('*')
      .eq('template_id', templateId)
      .order('display_order');

    if (appError) throw appError;

    return {
      deliverables: deliverables as ORPTemplateDeliverable[],
      approvals: approvals as ORPTemplateApproval[]
    };
  };

  const createTemplate = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      project_type: 'brownfield' | 'greenfield' | 'expansion';
      phase: 'ASSESS_SELECT' | 'DEFINE' | 'EXECUTE';
      deliverables: Array<{
        deliverable_id: string;
        estimated_manhours?: number;
        is_required: boolean;
      }>;
      approvals: Array<{
        approver_role: string;
      }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('orp_templates')
        .insert({
          name: data.name,
          description: data.description,
          project_type: data.project_type,
          phase: data.phase,
          created_by: user.id
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Add deliverables
      if (data.deliverables.length > 0) {
        const { error: delError } = await supabase
          .from('orp_template_deliverables')
          .insert(
            data.deliverables.map((d, index) => ({
              template_id: template.id,
              deliverable_id: d.deliverable_id,
              estimated_manhours: d.estimated_manhours,
              is_required: d.is_required,
              display_order: index
            }))
          );

        if (delError) throw delError;
      }

      // Add approvals
      if (data.approvals.length > 0) {
        const { error: appError } = await supabase
          .from('orp_template_approvals')
          .insert(
            data.approvals.map((a, index) => ({
              template_id: template.id,
              approver_role: a.approver_role,
              display_order: index
            }))
          );

        if (appError) throw appError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-templates'] });
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

  return {
    templates,
    isLoading,
    getTemplateDetails,
    createTemplate: createTemplate.mutate,
    isCreating: createTemplate.isPending
  };
};
