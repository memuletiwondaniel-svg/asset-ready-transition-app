import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResourceAllocation {
  user_id: string;
  user_name: string;
  position: string;
  avatar_url?: string;
  total_allocation: number;
  projects: Array<{
    plan_id: string;
    project_name: string;
    allocation_percentage: number;
    phase: string;
  }>;
  is_overallocated: boolean;
}

export const useORPResourceManagement = () => {
  const { data: resourceAllocations, isLoading } = useQuery({
    queryKey: ['orp-resource-allocations'],
    queryFn: async () => {
      // Get all active ORP plans with resources
      const { data: resources, error } = await supabase
        .from('orp_resources')
        .select(`
          *,
          orp_plan:orp_plans!inner(
            id,
            project:projects(project_title),
            phase,
            status
          ),
          user:profiles(full_name, avatar_url, position)
        `)
        .eq('orp_plan.is_active', true)
        .in('orp_plan.status', ['DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW']);

      if (error) throw error;

      // Group by user
      const userMap = new Map<string, ResourceAllocation>();

      resources?.forEach((resource: any) => {
        const userId = resource.user_id || resource.name; // Handle both assigned and unassigned
        
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            user_id: userId,
            user_name: resource.user?.full_name || resource.name,
            position: resource.user?.position || resource.position,
            avatar_url: resource.user?.avatar_url,
            total_allocation: 0,
            projects: [],
            is_overallocated: false
          });
        }

        const allocation = userMap.get(userId)!;
        const allocationPercent = resource.allocation_percentage || 0;
        
        allocation.total_allocation += allocationPercent;
        allocation.projects.push({
          plan_id: resource.orp_plan.id,
          project_name: resource.orp_plan.project?.project_title || 'Unknown',
          allocation_percentage: allocationPercent,
          phase: resource.orp_plan.phase
        });
        allocation.is_overallocated = allocation.total_allocation > 100;
      });

      return Array.from(userMap.values()).sort((a, b) => 
        b.total_allocation - a.total_allocation
      );
    }
  });

  const { data: conflictAnalysis } = useQuery({
    queryKey: ['orp-resource-conflicts'],
    queryFn: async () => {
      const allocations = resourceAllocations || [];
      
      return {
        overallocated_count: allocations.filter(r => r.is_overallocated).length,
        critical_resources: allocations.filter(r => r.total_allocation >= 90),
        available_capacity: allocations.filter(r => r.total_allocation < 70)
      };
    },
    enabled: !!resourceAllocations
  });

  return {
    resourceAllocations,
    conflictAnalysis,
    isLoading
  };
};
