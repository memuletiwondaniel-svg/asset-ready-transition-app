import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TrainingSystemMapping {
  id: string;
  training_item_id: string;
  system_id: string;
  handover_point_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface VCRTrainingItem {
  id: string;
  training_plan_id: string;
  title: string;
  overview?: string;
  training_provider?: string;
  duration_hours?: number;
  tentative_date?: string;
  scheduled_date?: string;
  estimated_cost: number;
  execution_stage: string;
  target_audience: string[];
  created_at: string;
  // Joined system mappings
  system_mappings?: Array<{
    id: string;
    system_id: string;
    handover_point_id: string | null;
    system?: {
      id: string;
      name: string;
      system_id: string;
    };
    handover_point?: {
      id: string;
      name: string;
      vcr_code: string;
    } | null;
  }>;
}

export const useVCRTraining = (handoverPlanId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all training items with their system mappings
  const { data: trainingItems, isLoading } = useQuery({
    queryKey: ['vcr-training-items', handoverPlanId],
    queryFn: async () => {
      // Get training plans for this ORA plan
      const { data: plans, error: plansError } = await supabase
        .from('ora_training_plans')
        .select('id')
        .eq('ora_plan_id', handoverPlanId);

      if (plansError) throw plansError;
      if (!plans || plans.length === 0) return [];

      const planIds = plans.map(p => p.id);

      // Get all training items from these plans
      const { data: items, error: itemsError } = await supabase
        .from('ora_training_items')
        .select('*')
        .in('training_plan_id', planIds)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;
      if (!items || items.length === 0) return [];

      const itemIds = items.map(i => i.id);

      // Get system mappings for these items
      const { data: mappings, error: mappingsError } = await supabase
        .from('ora_training_system_mappings')
        .select(`
          id,
          training_item_id,
          system_id,
          handover_point_id
        `)
        .in('training_item_id', itemIds);

      if (mappingsError) throw mappingsError;

      // Get system details
      const systemIds = [...new Set((mappings || []).map(m => m.system_id))];
      const hpIds = [...new Set((mappings || []).filter(m => m.handover_point_id).map(m => m.handover_point_id))];

      let systemsMap: Record<string, any> = {};
      let hpMap: Record<string, any> = {};

      if (systemIds.length > 0) {
        const { data: systems } = await supabase
          .from('p2a_systems')
          .select('id, name, system_id')
          .in('id', systemIds);
        
        systems?.forEach(s => { systemsMap[s.id] = s; });
      }

      if (hpIds.length > 0) {
        const { data: hps } = await supabase
          .from('p2a_handover_points')
          .select('id, name, vcr_code')
          .in('id', hpIds as string[]);
        
        hps?.forEach(h => { hpMap[h.id] = h; });
      }

      // Merge data
      return items.map(item => ({
        ...item,
        system_mappings: (mappings || [])
          .filter(m => m.training_item_id === item.id)
          .map(m => ({
            ...m,
            system: systemsMap[m.system_id],
            handover_point: m.handover_point_id ? hpMap[m.handover_point_id] : null,
          }))
      })) as VCRTrainingItem[];
    },
    enabled: !!handoverPlanId,
  });

  // Add training item with system mappings
  const addTrainingWithSystems = useMutation({
    mutationFn: async (data: {
      planId: string;
      item: {
        title: string;
        overview?: string;
        training_provider?: string;
        duration_hours?: number;
        tentative_date?: string;
        estimated_cost?: number;
        target_audience?: string[];
      };
      systemIds: string[];
      handoverPointId?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get next display order
      const { data: existingItems } = await supabase
        .from('ora_training_items')
        .select('display_order')
        .eq('training_plan_id', data.planId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existingItems?.[0]?.display_order || 0) + 1;

      // Insert training item
      const { data: newItem, error: itemError } = await supabase
        .from('ora_training_items')
        .insert({
          training_plan_id: data.planId,
          title: data.item.title,
          overview: data.item.overview,
          training_provider: data.item.training_provider,
          duration_hours: data.item.duration_hours,
          tentative_date: data.item.tentative_date,
          estimated_cost: data.item.estimated_cost || 0,
          target_audience: data.item.target_audience || [],
          display_order: nextOrder,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Insert system mappings
      if (data.systemIds.length > 0) {
        const mappings = data.systemIds.map(systemId => ({
          training_item_id: newItem.id,
          system_id: systemId,
          handover_point_id: data.handoverPointId || null,
          created_by: user.user.id,
        }));

        const { error: mappingError } = await supabase
          .from('ora_training_system_mappings')
          .insert(mappings);

        if (mappingError) throw mappingError;
      }

      return newItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-training-items'] });
      queryClient.invalidateQueries({ queryKey: ['ora-training-plans'] });
      toast({ title: 'Success', description: 'Training item added with system mappings' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Get training items for a specific VCR (handover point)
  const getTrainingForVCR = (handoverPointId: string) => {
    return trainingItems?.filter(item =>
      item.system_mappings?.some(m => m.handover_point_id === handoverPointId)
    ) || [];
  };

  // Get training items for a specific system
  const getTrainingForSystem = (systemId: string) => {
    return trainingItems?.filter(item =>
      item.system_mappings?.some(m => m.system_id === systemId)
    ) || [];
  };

  return {
    trainingItems: trainingItems || [],
    isLoading,
    addTrainingWithSystems: addTrainingWithSystems.mutate,
    addTrainingWithSystemsAsync: addTrainingWithSystems.mutateAsync,
    isAdding: addTrainingWithSystems.isPending,
    getTrainingForVCR,
    getTrainingForSystem,
  };
};
