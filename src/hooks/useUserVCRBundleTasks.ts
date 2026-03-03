import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface VCRSubItem {
  prerequisite_id?: string;
  checklist_response_id?: string;
  checklist_item_id?: string;
  summary: string;
  completed: boolean;
}

export interface VCRBundleTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: 'vcr_checklist_bundle' | 'vcr_approval_bundle' | 'pssr_checklist_bundle';
  status: string;
  priority: string;
  progress_percentage: number;
  sub_items: VCRSubItem[];
  metadata: {
    project_id?: string;
    project_code?: string;
    project_name?: string;
    vcr_id?: string;
    vcr_label?: string;
    pssr_id?: string;
    pssr_code?: string;
    delivering_party_id?: string;
    total_items?: number;
    completed_items?: number;
  };
  created_at: string;
  updated_at: string | null;
}

export const useUserVCRBundleTasks = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['user-vcr-bundle-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from('user_tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['vcr_checklist_bundle', 'vcr_approval_bundle', 'pssr_checklist_bundle'])
        .neq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((task: any) => ({
        id: task.id,
        user_id: task.user_id,
        title: task.title,
        type: task.type as VCRBundleTask['type'],
        description: task.description,
        status: task.status,
        priority: task.priority,
        progress_percentage: task.progress_percentage || 0,
        sub_items: (task.sub_items || []) as VCRSubItem[],
        metadata: task.metadata || {},
        created_at: task.created_at,
        updated_at: task.updated_at,
      })) as VCRBundleTask[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    bundleTasks: query.data || [],
  };
};
