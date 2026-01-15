import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

// Types
export interface PACCategory {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface PACPrerequisite {
  id: string;
  category_id: string;
  summary: string;
  description: string | null;
  sample_evidence: string | null;
  delivering_party_role_id: string | null;
  receiving_party_role_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: PACCategory;
  delivering_role?: { id: string; name: string };
  receiving_role?: { id: string; name: string };
}

export interface FACPrerequisite {
  id: string;
  summary: string;
  description: string | null;
  sample_evidence: string | null;
  delivering_party_role_id: string | null;
  receiving_party_role_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  delivering_role?: { id: string; name: string };
  receiving_role?: { id: string; name: string };
}

export interface PACTemplate {
  id: string;
  name: string;
  description: string | null;
  prerequisite_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// PAC Categories Hook
export function usePACCategories() {
  return useQuery({
    queryKey: ['pac-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pac_prerequisite_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as PACCategory[];
    },
  });
}

// PAC Prerequisites Hook
export function usePACPrerequisites() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pac-prerequisites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pac_prerequisites')
        .select(`
          *,
          category:pac_prerequisite_categories(id, name, display_name, description, display_order, is_active),
          delivering_role:roles!pac_prerequisites_delivering_party_role_id_fkey(id, name),
          receiving_role:roles!pac_prerequisites_receiving_party_role_id_fkey(id, name)
        `)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return (data || []) as unknown as PACPrerequisite[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (prerequisite: Omit<PACPrerequisite, 'id' | 'created_at' | 'updated_at' | 'category' | 'delivering_role' | 'receiving_role'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('pac_prerequisites')
        .insert({ ...prerequisite, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pac-prerequisites'] });
      toast({ title: 'Success', description: 'PAC prerequisite created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PACPrerequisite> & { id: string }) => {
      const { data, error } = await supabase
        .from('pac_prerequisites')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pac-prerequisites'] });
      toast({ title: 'Success', description: 'PAC prerequisite updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pac_prerequisites')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pac-prerequisites'] });
      toast({ title: 'Success', description: 'PAC prerequisite deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    ...query,
    createPrerequisite: createMutation.mutate,
    updatePrerequisite: updateMutation.mutate,
    deletePrerequisite: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// FAC Prerequisites Hook
export function useFACPrerequisites() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['fac-prerequisites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fac_prerequisites')
        .select(`
          *,
          delivering_role:roles!fac_prerequisites_delivering_party_role_id_fkey(id, name),
          receiving_role:roles!fac_prerequisites_receiving_party_role_id_fkey(id, name)
        `)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as FACPrerequisite[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (prerequisite: Omit<FACPrerequisite, 'id' | 'created_at' | 'updated_at' | 'delivering_role' | 'receiving_role'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('fac_prerequisites')
        .insert({ ...prerequisite, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fac-prerequisites'] });
      toast({ title: 'Success', description: 'FAC prerequisite created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FACPrerequisite> & { id: string }) => {
      const { data, error } = await supabase
        .from('fac_prerequisites')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fac-prerequisites'] });
      toast({ title: 'Success', description: 'FAC prerequisite updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fac_prerequisites')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fac-prerequisites'] });
      toast({ title: 'Success', description: 'FAC prerequisite deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    ...query,
    createPrerequisite: createMutation.mutate,
    updatePrerequisite: updateMutation.mutate,
    deletePrerequisite: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// PAC Templates Hook
export function usePACTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pac-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pac_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as PACTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Omit<PACTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('pac_templates')
        .insert({ ...template, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pac-templates'] });
      toast({ title: 'Success', description: 'PAC template created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PACTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('pac_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pac-templates'] });
      toast({ title: 'Success', description: 'PAC template updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pac_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pac-templates'] });
      toast({ title: 'Success', description: 'PAC template deleted successfully' });
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
