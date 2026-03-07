import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectORPActivity {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  completion_percentage: number;
  activity_code: string;
  parent_id: string | null;
}

export interface ProjectORPPlan {
  id: string;
  project_id: string;
  phase: 'ASSESS_SELECT' | 'DEFINE' | 'EXECUTE';
  status: 'DRAFT' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';
  created_at: string;
  updated_at: string;
  overall_progress: number;
  deliverable_count: number;
  completed_count: number;
  in_progress_count: number;
  not_started_count: number;
  p2a_progress: number;
  vcr_count: number;
  upcoming_activities: ProjectORPActivity[];
  completed_activities: ProjectORPActivity[];
  plan_start_date: string | null;
  plan_end_date: string | null;
}

function computeWeightedProgress(leafActivities: any[]): { overallProgress: number; completedCount: number; inProgressCount: number; notStartedCount: number; p2aProgress: number; vcrCount: number } {
  if (leafActivities.length === 0) {
    return { overallProgress: 0, completedCount: 0, inProgressCount: 0, notStartedCount: 0, p2aProgress: 0, vcrCount: 0 };
  }

  const completedCount = leafActivities.filter((a: any) => a.status === 'COMPLETED').length;
  const inProgressCount = leafActivities.filter((a: any) => a.status === 'IN_PROGRESS').length;
  const notStartedCount = leafActivities.filter((a: any) => a.status !== 'COMPLETED' && a.status !== 'IN_PROGRESS').length;

  // Separate P2A (VCR-) activities from non-P2A
  const p2aActivities = leafActivities.filter((a: any) => (a.activity_code || '').startsWith('VCR-'));
  const nonP2aActivities = leafActivities.filter((a: any) => !(a.activity_code || '').startsWith('VCR-'));

  // P2A always takes 50% of overall progress, even if none exist (p2aProgress = 0)
  if (p2aActivities.length === 0) {
    const nonP2aAvg = leafActivities.length > 0
      ? leafActivities.reduce((s: number, a: any) => s + (a.completion_percentage || 0), 0) / leafActivities.length / 100
      : 0;
    const overallProgress = Math.round(nonP2aAvg * 0.5 * 100);
    return { overallProgress, completedCount, inProgressCount, notStartedCount, p2aProgress: 0, vcrCount: 0 };
  }

  // Group P2A by top-level VCR code (e.g. VCR-001)
  const vcrGroups: Record<string, any[]> = {};
  p2aActivities.forEach((a: any) => {
    const parts = (a.activity_code || '').split('-');
    const vcrKey = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : a.activity_code;
    if (!vcrGroups[vcrKey]) vcrGroups[vcrKey] = [];
    vcrGroups[vcrKey].push(a);
  });

  const vcrKeys = Object.keys(vcrGroups);
  const vcrCount = vcrKeys.length;
  const perVcrWeight = 1 / vcrCount;

  let p2aScore = 0;
  vcrKeys.forEach(key => {
    const acts = vcrGroups[key];
    const sysReadiness = acts.filter((a: any) => /system[s]?\s*readiness/i.test(a.name || ''));
    const others = acts.filter((a: any) => !/system[s]?\s*readiness/i.test(a.name || ''));

    const sysAvg = sysReadiness.length > 0
      ? sysReadiness.reduce((s: number, a: any) => s + (a.completion_percentage || 0), 0) / sysReadiness.length / 100
      : 0;
    const othersAvg = others.length > 0
      ? others.reduce((s: number, a: any) => s + (a.completion_percentage || 0), 0) / others.length / 100
      : 0;

    // If only one category exists, give it full weight
    let vcrScore: number;
    if (sysReadiness.length > 0 && others.length > 0) {
      vcrScore = (sysAvg * 0.2) + (othersAvg * 0.8);
    } else if (sysReadiness.length > 0) {
      vcrScore = sysAvg;
    } else {
      vcrScore = othersAvg;
    }

    p2aScore += vcrScore * perVcrWeight;
  });

  const p2aProgress = Math.round(p2aScore * 100);

  // Non-P2A average
  const nonP2aAvg = nonP2aActivities.length > 0
    ? nonP2aActivities.reduce((s: number, a: any) => s + (a.completion_percentage || 0), 0) / nonP2aActivities.length / 100
    : 0;

  const overallProgress = Math.round((p2aScore * 0.5 + nonP2aAvg * 0.5) * 100);

  return { overallProgress, completedCount, inProgressCount, notStartedCount, p2aProgress, vcrCount };
}

const PHASE_LABELS: Record<string, string> = {
  'ASSESS_SELECT': 'Assess & Select',
  'DEFINE': 'Define',
  'EXECUTE': 'Execute',
};

export const useProjectORPPlans = (projectId: string) => {
  return useQuery({
    queryKey: ['project-orp-plans', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // Fetch plans
      const { data: plans, error } = await (supabase as any)
        .from('orp_plans')
        .select('id, project_id, phase, status, created_at, updated_at, wizard_state')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!plans || plans.length === 0) return [];

      // For each plan, fetch ora_plan_activities
      const plansWithProgress: ProjectORPPlan[] = await Promise.all(
        (plans as any[]).map(async (plan) => {
          const { data: activities } = await (supabase as any)
            .from('ora_plan_activities')
            .select('id, name, status, start_date, end_date, completion_percentage, activity_code, parent_id')
            .eq('orp_plan_id', plan.id)
            .order('activity_code');

          const ws = plan.wizard_state as any;
          const wsActivities: any[] = (ws?.activities || []).filter((a: any) => a.selected);

          // Build a merged activity list: wizard_state as base, DB overrides on top
          const dbMap = new Map<string, any>();
          if (activities && activities.length > 0) {
            activities.forEach((a: any) => {
              dbMap.set(a.id, a);
            });
          }

          // Merge: use wsActivities as the canonical list, overlay DB data
          const mergedActivities = wsActivities.map((wsA: any) => {
            const rawId = String(wsA.id || '').replace(/^(ora-|ws-)/, '');
            const dbRow = dbMap.get(rawId);
            return {
              id: rawId,
              name: dbRow?.name || wsA.activity || wsA.name || 'Unnamed',
              status: dbRow?.status || 'NOT_STARTED',
              start_date: dbRow?.start_date || wsA.startDate || null,
              end_date: dbRow?.end_date || wsA.endDate || null,
              completion_percentage: dbRow?.completion_percentage || 0,
              activity_code: dbRow?.activity_code || wsA.activityCode || '',
              parent_id: dbRow?.parent_id || wsA.parentActivityId || null,
            };
          });

          // If no wizard_state activities, fall back to DB activities
          const sourceActivities = mergedActivities.length > 0 ? mergedActivities : (activities || []);

          // Filter to leaf activities (no children)
          const leafActivities = sourceActivities.filter((a: any) => {
            return !sourceActivities.some((other: any) => other.parent_id === a.id);
          });

          const totalCount = leafActivities.length;
          const stats = computeWeightedProgress(leafActivities);

          // Get date range
          const allDates = sourceActivities
            .filter((a: any) => a.start_date || a.end_date)
            .flatMap((a: any) => [a.start_date, a.end_date].filter(Boolean));
          const planStartDate = allDates.length > 0 ? allDates.sort()[0] : null;
          const planEndDate = allDates.length > 0 ? allDates.sort().reverse()[0] : null;

          // Upcoming: not completed, sorted by start_date
          const upcoming: ProjectORPActivity[] = sourceActivities
            .filter((a: any) => a.status !== 'COMPLETED')
            .sort((a: any, b: any) => {
              if (!a.start_date && !b.start_date) return 0;
              if (!a.start_date) return 1;
              if (!b.start_date) return -1;
              return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
            })
            .slice(0, 10);

          return {
            id: plan.id,
            project_id: plan.project_id,
            phase: plan.phase,
            status: plan.status,
            created_at: plan.created_at,
            updated_at: plan.updated_at,
            overall_progress: stats.overallProgress,
            deliverable_count: totalCount,
            completed_count: stats.completedCount,
            in_progress_count: stats.inProgressCount,
            not_started_count: stats.notStartedCount,
            p2a_progress: stats.p2aProgress,
            vcr_count: stats.vcrCount,
            upcoming_activities: upcoming,
            plan_start_date: planStartDate,
            plan_end_date: planEndDate,
          };

        })
      );

      return plansWithProgress;
    },
    enabled: !!projectId,
    staleTime: 60000,
  });
};

export { PHASE_LABELS };
