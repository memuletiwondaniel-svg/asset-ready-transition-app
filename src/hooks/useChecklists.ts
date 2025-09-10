import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Checklist {
  id: string;
  name: string;
  reason: string;
  created_at: string;
  created_by: string;
  category: string;
  status: 'Active' | 'Draft' | 'Archived';
  items_count: number;
  active_pssr_count: number;
  selected_items: string[];
}

export interface CreateChecklistData {
  name: string;
  reason: string;
  category: string;
  status: 'Active' | 'Draft';
  selected_items: string[];
}

export const useChecklists = () => {
  return useQuery({
    queryKey: ['checklists'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // For now, return empty array since we don't have checklists table yet
      // This will be updated when the database table is created
      return [] as Checklist[];
    },
  });
};

export const useCreateChecklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checklistData: CreateChecklistData): Promise<Checklist> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // For now, return mock data since we don't have checklists table yet
      const mockChecklist: Checklist = {
        id: `checklist-${Date.now()}`,
        name: checklistData.name,
        reason: checklistData.reason,
        created_at: new Date().toISOString(),
        created_by: session.user.email || 'Unknown',
        category: checklistData.category,
        status: checklistData.status,
        items_count: checklistData.selected_items.length,
        active_pssr_count: 0,
        selected_items: checklistData.selected_items,
      };

      return mockChecklist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
    },
  });
};

export const useChecklistDetails = (checklistId: string) => {
  return useQuery({
    queryKey: ['checklist-details', checklistId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // For now, return mock data
      // This will fetch actual checklist details when database is ready
      return null;
    },
    enabled: !!checklistId,
  });
};

export const useActivePSSRsForChecklist = (checklistId: string) => {
  return useQuery({
    queryKey: ['active-pssrs', checklistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssrs')
        .select(`
          id,
          pssr_id,
          project_name,
          asset,
          status,
          created_at,
          updated_at
        `)
        .eq('status', 'DRAFT')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate progress based on checklist responses
      const pssrsWithProgress = await Promise.all(
        data.map(async (pssr) => {
          const { data: responses } = await supabase
            .from('pssr_checklist_responses')
            .select('status')
            .eq('pssr_id', pssr.id);

          const totalResponses = responses?.length || 0;
          const completedResponses = responses?.filter(r => r.status === 'SUBMITTED').length || 0;
          const progress = totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0;

          return {
            id: pssr.pssr_id,
            projectName: pssr.project_name,
            asset: pssr.asset,
            status: pssr.status,
            progress,
            createdAt: pssr.created_at,
          };
        })
      );

      return pssrsWithProgress;
    },
    enabled: !!checklistId,
  });
};