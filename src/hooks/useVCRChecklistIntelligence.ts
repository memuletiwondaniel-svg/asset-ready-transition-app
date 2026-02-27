import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Maps VCR checklist prerequisite categories to ora_plan_activities source_ref_table values.
 */
const CATEGORY_TO_SOURCE_TABLE: Record<string, string[]> = {
  training: ['p2a_vcr_training'],
  procedures: ['p2a_vcr_procedures'],
  documentation: ['p2a_vcr_critical_docs'],
  cmms: ['p2a_vcr_deliverables'],
  spares: ['p2a_vcr_deliverables'],
  systems: ['p2a_systems', 'p2a_handover_point_systems'],
  registers: ['p2a_vcr_operational_registers'],
  logsheets: ['p2a_vcr_logsheets'],
};

export interface ChecklistIntelligence {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percentage: number;
  activities: Array<{
    id: string;
    name: string;
    status: string;
    completion_percentage: number;
    activity_code: string;
  }>;
}

/**
 * Fetches ORA activity completion data for a specific VCR and building block category.
 * Used to show inline progress badges on VCR checklist items.
 */
export function useVCRChecklistIntelligence(
  vcrId: string | undefined,
  projectId: string | undefined,
  category?: string
) {
  return useQuery({
    queryKey: ['vcr-checklist-intelligence', vcrId, projectId, category],
    queryFn: async (): Promise<ChecklistIntelligence> => {
      const client = supabase as any;

      // Find the ORP plan for this project
      const { data: orpPlan } = await client
        .from('orp_plans')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .maybeSingle();

      if (!orpPlan) return { total: 0, completed: 0, inProgress: 0, notStarted: 0, percentage: 0, activities: [] };

      // Find the VCR parent activity
      const { data: vcrActivity } = await client
        .from('ora_plan_activities')
        .select('id')
        .eq('orp_plan_id', orpPlan.id)
        .eq('source_type', 'p2a_vcr')
        .eq('source_ref_id', vcrId)
        .maybeSingle();

      if (!vcrActivity) return { total: 0, completed: 0, inProgress: 0, notStarted: 0, percentage: 0, activities: [] };

      // Get all leaf activities (those without children) under this VCR
      let query = client
        .from('ora_plan_activities')
        .select('id, name, status, completion_percentage, activity_code, source_ref_table, parent_id')
        .eq('orp_plan_id', orpPlan.id);

      // If category specified, filter by source_ref_table
      const sourceTables = category ? CATEGORY_TO_SOURCE_TABLE[category.toLowerCase()] : null;

      const { data: allActivities } = await query;
      if (!allActivities?.length) return { total: 0, completed: 0, inProgress: 0, notStarted: 0, percentage: 0, activities: [] };

      // Build parent chain to filter descendants of vcrActivity
      const idSet = new Set<string>();
      const parentMap = new Map<string, string | null>();
      allActivities.forEach((a: any) => {
        parentMap.set(a.id, a.parent_id);
      });

      // Find all descendants of vcrActivity.id
      function isDescendant(id: string): boolean {
        if (idSet.has(id)) return true;
        let current = id;
        while (current) {
          if (current === vcrActivity.id) { idSet.add(id); return true; }
          current = parentMap.get(current) || '';
        }
        return false;
      }

      const descendants = allActivities.filter((a: any) => a.id !== vcrActivity.id && isDescendant(a.id));

      // Filter by category if specified
      let filtered = descendants;
      if (sourceTables) {
        filtered = descendants.filter((a: any) => sourceTables.includes(a.source_ref_table));
      }

      // Only leaf activities (no children)
      const childIds = new Set(allActivities.map((a: any) => a.parent_id).filter(Boolean));
      const leafActivities = filtered.filter((a: any) => !childIds.has(a.id));

      const total = leafActivities.length;
      const completed = leafActivities.filter((a: any) => a.status === 'COMPLETED').length;
      const inProgress = leafActivities.filter((a: any) => a.status === 'IN_PROGRESS').length;
      const notStarted = total - completed - inProgress;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        total,
        completed,
        inProgress,
        notStarted,
        percentage,
        activities: leafActivities.map((a: any) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          completion_percentage: a.completion_percentage || 0,
          activity_code: a.activity_code,
        })),
      };
    },
    enabled: !!vcrId && !!projectId,
    staleTime: 30_000,
  });
}

/**
 * Fetches overall VCR completion from ORA activities (all building blocks combined).
 */
export function useVCROverallIntelligence(vcrId: string | undefined, projectId: string | undefined) {
  return useVCRChecklistIntelligence(vcrId, projectId);
}
