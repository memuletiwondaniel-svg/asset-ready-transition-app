import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type Checklist = Tables<'checklists'> & {
  items_count: number;
  active_pssr_count: number;
  created_by_email?: string;
};

export interface CreateChecklistData {
  name: string;
  reason: string;
  custom_reason?: string;
  selected_items: string[];
}

export const useChecklists = () => {
  return useQuery({
    queryKey: ['checklists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate items count and active PSSR count for each checklist
      const checklistsWithCounts = await Promise.all(
        data.map(async (checklist) => {
          const items_count = checklist.selected_items?.length || 0;
          
          // Count active PSSRs using this checklist
          const { count: active_pssr_count } = await supabase
            .from('pssrs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'DRAFT');

          // Get creator email
          let profile = null;
          if (checklist.created_by) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email')
              .eq('user_id', checklist.created_by)
              .single();
            profile = profileData;
          }

          return {
            ...checklist,
            items_count,
            active_pssr_count: active_pssr_count || 0,
            created_by_email: profile?.email || 'Anonymous',
          };
        })
      );

      return checklistsWithCounts;
    },
  });
};

export const useCreateChecklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checklistData: CreateChecklistData): Promise<Checklist> => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      // If reason is "Others" and custom_reason is provided, save it as a custom reason (only if authenticated)
      if (checklistData.reason === 'Others' && checklistData.custom_reason && userId) {
        const { error: customReasonError } = await supabase
          .from('custom_reasons')
          .upsert({
            reason_text: checklistData.custom_reason,
            created_by: userId,
          }, {
            onConflict: 'reason_text',
            ignoreDuplicates: true
          });
        
        if (customReasonError) {
          console.warn('Failed to save custom reason:', customReasonError);
        }
      }

      const { data, error } = await supabase
        .from('checklists')
        .insert({
          name: checklistData.name,
          reason: checklistData.reason === 'Others' ? checklistData.custom_reason! : checklistData.reason,
          custom_reason: checklistData.reason === 'Others' ? checklistData.custom_reason : null,
          selected_items: checklistData.selected_items,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        items_count: checklistData.selected_items.length,
        active_pssr_count: 0,
        created_by_email: session?.user?.email || 'Anonymous',
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
    },
  });
};

export const useUpdateChecklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ checklistId, checklistData }: { checklistId: string; checklistData: Partial<CreateChecklistData> }): Promise<Checklist> => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      // If reason is "Others" and custom_reason is provided, save it as a custom reason (only if authenticated)
      if (checklistData.reason === 'Others' && checklistData.custom_reason && userId) {
        const { error: customReasonError } = await supabase
          .from('custom_reasons')
          .upsert({
            reason_text: checklistData.custom_reason,
            created_by: userId,
          }, {
            onConflict: 'reason_text',
            ignoreDuplicates: true
          });
        
        if (customReasonError) {
          console.warn('Failed to save custom reason:', customReasonError);
        }
      }

      const updateData: any = {};
      if (checklistData.name) updateData.name = checklistData.name;
      if (checklistData.reason) {
        updateData.reason = checklistData.reason === 'Others' ? checklistData.custom_reason! : checklistData.reason;
        updateData.custom_reason = checklistData.reason === 'Others' ? checklistData.custom_reason : null;
      }
      if (checklistData.selected_items) updateData.selected_items = checklistData.selected_items;

      const { data, error } = await supabase
        .from('checklists')
        .update(updateData)
        .eq('id', checklistId)
        .select()
        .single();

      if (error) throw error;

      // Get creator email
      let profile = null;
      if (data.created_by) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', data.created_by)
          .single();
        profile = profileData;
      }

      return {
        ...data,
        items_count: data.selected_items?.length || 0,
        active_pssr_count: 0, // This would need to be calculated if needed
        created_by_email: profile?.email || 'Anonymous',
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
    },
  });
};

export const useCustomReasons = () => {
  return useQuery({
    queryKey: ['custom-reasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_reasons')
        .select('reason_text')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(item => item.reason_text);
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