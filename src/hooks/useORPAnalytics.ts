import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useORPAnalytics = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['orp-analytics'],
    queryFn: async () => {
      // Get all active ORPs
      const { data: plans, error: plansError } = await supabase
        .from('orp_plans')
        .select(`
          *,
          project:projects(project_title, project_id_prefix, project_id_number),
          deliverables:orp_plan_deliverables(status, estimated_manhours, completion_percentage),
          resources:orp_resources(allocation_percentage),
          risks:orp_risks(severity, status)
        `)
        .eq('is_active', true);

      if (plansError) throw plansError;

      // Calculate analytics
      const totalPlans = plans?.length || 0;
      const plansByPhase = {
        ASSESS_SELECT: plans?.filter(p => p.phase === 'ASSESS_SELECT').length || 0,
        DEFINE: plans?.filter(p => p.phase === 'DEFINE').length || 0,
        EXECUTE: plans?.filter(p => p.phase === 'EXECUTE').length || 0
      };

      const plansByStatus = {
        DRAFT: plans?.filter(p => p.status === 'DRAFT').length || 0,
        IN_PROGRESS: plans?.filter(p => p.status === 'IN_PROGRESS').length || 0,
        PENDING_APPROVAL: plans?.filter(p => p.status === 'PENDING_APPROVAL').length || 0,
        APPROVED: plans?.filter(p => p.status === 'APPROVED').length || 0,
        COMPLETED: plans?.filter(p => p.status === 'COMPLETED').length || 0
      };

      // Deliverable statistics
      let totalDeliverables = 0;
      let completedDeliverables = 0;
      let totalManhours = 0;
      let avgProgress = 0;

      plans?.forEach(plan => {
        totalDeliverables += plan.deliverables?.length || 0;
        completedDeliverables += plan.deliverables?.filter(d => d.status === 'COMPLETED').length || 0;
        totalManhours += plan.deliverables?.reduce((sum, d) => sum + (parseFloat(String(d.estimated_manhours || 0))), 0) || 0;
        const planProgress = plan.deliverables?.reduce((sum, d) => sum + (d.completion_percentage || 0), 0) || 0;
        avgProgress += plan.deliverables?.length ? planProgress / plan.deliverables.length : 0;
      });

      avgProgress = totalPlans ? avgProgress / totalPlans : 0;

      // Resource utilization
      const resourceData = plans?.flatMap(p => p.resources || []) || [];
      const avgAllocation = resourceData.length 
        ? resourceData.reduce((sum, r) => sum + (r.allocation_percentage || 0), 0) / resourceData.length 
        : 0;

      // Risk statistics
      const allRisks = plans?.flatMap(p => p.risks || []) || [];
      const risksByServerity = {
        CRITICAL: allRisks.filter(r => r.severity === 'CRITICAL').length,
        HIGH: allRisks.filter(r => r.severity === 'HIGH').length,
        MEDIUM: allRisks.filter(r => r.severity === 'MEDIUM').length,
        LOW: allRisks.filter(r => r.severity === 'LOW').length
      };

      const openRisks = allRisks.filter(r => r.status === 'OPEN').length;

      // Trends (simple month-over-month)
      const currentMonth = new Date().toISOString().slice(0, 7);
      const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

      const currentMonthPlans = plans?.filter(p => p.created_at.startsWith(currentMonth)).length || 0;
      const lastMonthPlans = plans?.filter(p => p.created_at.startsWith(lastMonth)).length || 0;
      const plansTrend = lastMonthPlans ? ((currentMonthPlans - lastMonthPlans) / lastMonthPlans) * 100 : 0;

      return {
        overview: {
          totalPlans,
          totalDeliverables,
          completedDeliverables,
          totalManhours,
          avgProgress: Math.round(avgProgress),
          avgResourceAllocation: Math.round(avgAllocation),
          openRisks
        },
        plansByPhase,
        plansByStatus,
        risksByServerity,
        trends: {
          plansTrend: Math.round(plansTrend),
          currentMonthPlans,
          lastMonthPlans
        },
        topProjects: plans?.slice(0, 10).map(p => ({
          id: p.id,
          name: p.project?.project_title || 'Unknown',
          phase: p.phase,
          progress: p.deliverables?.length 
            ? Math.round(p.deliverables.reduce((sum, d) => sum + (d.completion_percentage || 0), 0) / p.deliverables.length)
            : 0,
          manhours: p.deliverables?.reduce((sum, d) => sum + (parseFloat(String(d.estimated_manhours || 0))), 0) || 0
        }))
      };
    }
  });

  return {
    analytics,
    isLoading
  };
};
