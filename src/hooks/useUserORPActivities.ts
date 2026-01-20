import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface UserORPActivity {
  id: string;
  plan_id: string;
  user_id: string;
  role: string;
  allocation_percentage: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  // Joined data
  plan_name?: string;
  project_name?: string;
  project_number?: string;
  phase?: string;
  plan_status?: string;
  deliverable_count?: number;
  completed_deliverables?: number;
}

export const useUserORPActivities = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['user-orp-activities', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch resources assigned to user
      const { data: resources, error: resourceError } = await supabase
        .from('orp_resources')
        .select(`
          *,
          orp_plans!inner (
            id,
            plan_name,
            project_name,
            project_number,
            phase,
            status,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .eq('orp_plans.is_active', true);

      if (resourceError) throw resourceError;

      const planIds: string[] = [...new Set((resources || []).map((r: any) => r.plan_id as string))];
      
      const deliverableStats: Record<string, { total: number; completed: number }> = {};
      
      if (planIds.length > 0) {
        const { data: deliverables, error: delError } = await supabase
          .from('orp_plan_deliverables')
          .select('plan_id, status');

        if (!delError && deliverables) {
          // Filter in JS to avoid TS issues
          const filtered = deliverables.filter((d: any) => planIds.includes(d.plan_id));
          filtered.forEach((d: any) => {
            if (!deliverableStats[d.plan_id]) {
              deliverableStats[d.plan_id] = { total: 0, completed: 0 };
            }
            deliverableStats[d.plan_id].total++;
            if (d.status === 'COMPLETED') {
              deliverableStats[d.plan_id].completed++;
            }
          });
        }
      }

      return (resources || []).map((item: any) => ({
        id: item.id,
        plan_id: item.plan_id,
        user_id: item.user_id,
        role: item.role,
        allocation_percentage: item.allocation_percentage || 0,
        start_date: item.start_date,
        end_date: item.end_date,
        created_at: item.created_at,
        plan_name: item.orp_plans?.plan_name,
        project_name: item.orp_plans?.project_name,
        project_number: item.orp_plans?.project_number,
        phase: item.orp_plans?.phase,
        plan_status: item.orp_plans?.status,
        deliverable_count: deliverableStats[item.plan_id]?.total || 0,
        completed_deliverables: deliverableStats[item.plan_id]?.completed || 0,
      })) as UserORPActivity[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Calculate stats
  const stats = {
    totalPlans: [...new Set(query.data?.map(a => a.plan_id) || [])].length,
    totalDeliverables: query.data?.reduce((acc, a) => acc + (a.deliverable_count || 0), 0) || 0,
    completedDeliverables: query.data?.reduce((acc, a) => acc + (a.completed_deliverables || 0), 0) || 0,
    inProgress: query.data?.filter(a => a.plan_status === 'IN_PROGRESS')?.length || 0,
  };

  return {
    ...query,
    activities: query.data || [],
    stats,
  };
};
