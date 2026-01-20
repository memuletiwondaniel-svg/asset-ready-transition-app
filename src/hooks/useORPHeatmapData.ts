import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type ORPStatus = Database['public']['Enums']['orp_status'];
type ORPPhase = Database['public']['Enums']['orp_phase'];
type ORPDeliverableStatus = Database['public']['Enums']['orp_deliverable_status'];

export interface ORPPlanWithDetails {
  id: string;
  project_id: string;
  phase: ORPPhase;
  status: ORPStatus;
  ora_engineer_id: string;
  created_at: string;
  updated_at: string;
  project?: {
    project_id_prefix: string;
    project_id_number: string;
    project_title: string;
  };
  deliverables_summary: {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    overall_percentage: number;
  };
}

export interface ORPDeliverableCategory {
  id: string;
  name: string;
  phase: ORPPhase;
  display_order: number;
}

export interface ORPHeatmapCellData {
  orpPlanId: string;
  categoryId: string;
  categoryName: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  completionPercentage: number;
  deliverableCount: number;
  completedCount: number;
  inProgressCount: number;
  lastUpdated?: string;
}

export type ORPHeatmapDataMap = Map<string, ORPHeatmapCellData>;

// Fetch all active ORP plans with project info
export const useORPPlans = () => {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['orp-plans-heatmap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_plans')
        .select(`
          id,
          project_id,
          phase,
          status,
          ora_engineer_id,
          created_at,
          updated_at,
          project:projects(
            project_id_prefix,
            project_id_number,
            project_title
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch deliverables for each plan to calculate summary
      const plansWithSummary: ORPPlanWithDetails[] = await Promise.all(
        (data || []).map(async (plan) => {
          const { data: deliverables } = await supabase
            .from('orp_plan_deliverables')
            .select('status, completion_percentage')
            .eq('orp_plan_id', plan.id);

          const total = deliverables?.length || 0;
          const completed = deliverables?.filter(d => d.status === 'COMPLETED').length || 0;
          const inProgress = deliverables?.filter(d => d.status === 'IN_PROGRESS').length || 0;
          const notStarted = deliverables?.filter(d => d.status === 'NOT_STARTED').length || 0;
          
          const overallPercentage = total > 0
            ? Math.round(deliverables!.reduce((sum, d) => sum + (d.completion_percentage || 0), 0) / total)
            : 0;

          return {
            ...plan,
            project: plan.project as ORPPlanWithDetails['project'],
            deliverables_summary: {
              total,
              completed,
              in_progress: inProgress,
              not_started: notStarted,
              overall_percentage: overallPercentage
            }
          };
        })
      );

      return plansWithSummary;
    }
  });

  return { plans: plans || [], isLoading };
};

// Fetch deliverable categories from catalog
export const useORPDeliverableCategories = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['p2a-deliverable-categories'],
    queryFn: async () => {
      // Use P2A deliverable categories for the heatmap columns
      const { data, error } = await supabase
        .from('p2a_deliverable_categories')
        .select('id, name, display_order')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      // Map to expected interface - phase is not used for P2A categories
      return (data || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        phase: 'EXECUTE' as ORPPhase, // Default phase for P2A
        display_order: cat.display_order
      })) as ORPDeliverableCategory[];
    }
  });

  return { categories: categories || [], isLoading };
};

// Fetch heatmap data - aggregated by plan and deliverable category
export const useORPHeatmapData = () => {
  const { data: heatmapData, isLoading } = useQuery({
    queryKey: ['orp-heatmap-data'],
    queryFn: async () => {
      // Fetch all plan deliverables with catalog info
      const { data: deliverables, error } = await supabase
        .from('orp_plan_deliverables')
        .select(`
          id,
          orp_plan_id,
          deliverable_id,
          status,
          completion_percentage,
          updated_at,
          catalog:orp_deliverables_catalog(id, name, phase)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Group by plan_id + deliverable_id (each deliverable is a cell)
      const result: ORPHeatmapDataMap = new Map();

      deliverables?.forEach((deliverable) => {
        const catalog = deliverable.catalog as any;
        if (!catalog) return;

        const key = `${deliverable.orp_plan_id}-${catalog.id}`;
        
        // Map ORP status to display status
        let displayStatus: ORPHeatmapCellData['status'] = 'NOT_STARTED';
        if (deliverable.status === 'COMPLETED') {
          displayStatus = 'COMPLETED';
        } else if (deliverable.status === 'IN_PROGRESS') {
          displayStatus = 'IN_PROGRESS';
        } else if (deliverable.status === 'ON_HOLD') {
          displayStatus = 'ON_HOLD';
        }

        const existing = result.get(key);
        if (existing) {
          // Aggregate multiple deliverables of same type
          existing.deliverableCount++;
          if (deliverable.status === 'COMPLETED') existing.completedCount++;
          if (deliverable.status === 'IN_PROGRESS') existing.inProgressCount++;
          existing.completionPercentage = Math.round(
            ((existing.completedCount / existing.deliverableCount) * 100)
          );
          // Update status based on aggregation
          if (existing.completedCount === existing.deliverableCount) {
            existing.status = 'COMPLETED';
          } else if (existing.inProgressCount > 0 || existing.completedCount > 0) {
            existing.status = 'IN_PROGRESS';
          }
        } else {
          result.set(key, {
            orpPlanId: deliverable.orp_plan_id,
            categoryId: catalog.id,
            categoryName: catalog.name,
            status: displayStatus,
            completionPercentage: deliverable.completion_percentage || 0,
            deliverableCount: 1,
            completedCount: deliverable.status === 'COMPLETED' ? 1 : 0,
            inProgressCount: deliverable.status === 'IN_PROGRESS' ? 1 : 0,
            lastUpdated: deliverable.updated_at
          });
        }
      });

      return result;
    }
  });

  return {
    heatmapData: heatmapData || new Map(),
    isLoading
  };
};
