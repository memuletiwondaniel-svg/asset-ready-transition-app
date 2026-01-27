import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface VCRRelationship {
  id: string;
  source_vcr_id: string;
  target_vcr_id: string;
  relationship_type: 'PREREQUISITE' | 'DEPENDENT';
  created_by?: string;
  created_at: string;
}

export const useVCRRelationships = (handoverPlanId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all relationships for VCRs in this plan
  const { data: relationships, isLoading } = useQuery({
    queryKey: ['vcr-relationships', handoverPlanId],
    queryFn: async () => {
      // First get all VCR IDs for this plan
      const { data: vcrs, error: vcrsError } = await supabase
        .from('p2a_handover_points')
        .select('id')
        .eq('handover_plan_id', handoverPlanId);

      if (vcrsError) throw vcrsError;
      if (!vcrs?.length) return [];

      const vcrIds = vcrs.map((v) => v.id);

      // Get relationships where either source or target is in this plan
      const { data, error } = await supabase
        .from('p2a_vcr_relationships')
        .select('*')
        .or(`source_vcr_id.in.(${vcrIds.join(',')}),target_vcr_id.in.(${vcrIds.join(',')})`);

      if (error) throw error;
      return data as VCRRelationship[];
    },
    enabled: !!handoverPlanId,
  });

  const createRelationship = useMutation({
    mutationFn: async ({
      sourceVcrId,
      targetVcrId,
      relationshipType,
    }: {
      sourceVcrId: string;
      targetVcrId: string;
      relationshipType: 'PREREQUISITE' | 'DEPENDENT';
    }) => {
      const { data, error } = await supabase
        .from('p2a_vcr_relationships')
        .insert({
          source_vcr_id: sourceVcrId,
          target_vcr_id: targetVcrId,
          relationship_type: relationshipType,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-relationships', handoverPlanId] });
      toast({ title: 'Success', description: 'VCR relationship created' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteRelationship = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('p2a_vcr_relationships')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-relationships', handoverPlanId] });
      toast({ title: 'Success', description: 'VCR relationship removed' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    relationships: relationships || [],
    isLoading,
    createRelationship: createRelationship.mutate,
    deleteRelationship: deleteRelationship.mutate,
    isCreating: createRelationship.isPending,
    isDeleting: deleteRelationship.isPending,
  };
};
