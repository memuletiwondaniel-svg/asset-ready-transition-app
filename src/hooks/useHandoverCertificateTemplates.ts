import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export type CertificateType = 'PAC' | 'FAC' | 'SOF';

export interface CertificateTemplate {
  id: string;
  certificate_type: CertificateType;
  name: string;
  content: string;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCertificateTemplates(type?: CertificateType) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['certificate-templates', type],
    queryFn: async () => {
      let query = supabase
        .from('handover_certificate_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');

      if (type) {
        query = query.eq('certificate_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CertificateTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Omit<CertificateTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('handover_certificate_templates')
        .insert({ ...template, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      toast({ title: 'Success', description: 'Certificate template created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CertificateTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('handover_certificate_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      toast({ title: 'Success', description: 'Certificate template updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('handover_certificate_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      toast({ title: 'Success', description: 'Certificate template deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: CertificateType }) => {
      // First, unset all defaults for this type
      await supabase
        .from('handover_certificate_templates')
        .update({ is_default: false })
        .eq('certificate_type', type);

      // Then set the new default
      const { data, error } = await supabase
        .from('handover_certificate_templates')
        .update({ is_default: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      toast({ title: 'Success', description: 'Default template updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    ...query,
    templates: query.data || [],
    createTemplate: createMutation.mutate,
    updateTemplate: updateMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    setDefault: setDefaultMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useDefaultCertificateTemplate(type: CertificateType) {
  return useQuery({
    queryKey: ['certificate-template-default', type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('handover_certificate_templates')
        .select('*')
        .eq('certificate_type', type)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as CertificateTemplate | null;
    },
  });
}
