import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MOCK_ORM_PLANS = [
  {
    id: 'mock-orm-1',
    project_id: 'mock-proj-1',
    orm_lead_id: 'mock-lead-1',
    status: 'ACTIVE',
    overall_progress: 62,
    scope_description: 'Full CMMS setup for Khurais expansion',
    created_at: '2025-11-15T08:00:00Z',
    updated_at: '2026-03-08T14:00:00Z',
    estimated_completion_date: '2026-08-30',
    project: { project_title: 'Khurais Expansion Phase 2', project_id_prefix: 'KHR', project_id_number: '0042' },
    deliverables: [
      { id: 'd1', orm_plan_id: 'mock-orm-1', deliverable_type: 'ASSET_REGISTER', workflow_stage: 'LEAD_REVIEW', progress_percentage: 85, estimated_hours: 120, actual_hours: 98, start_date: '2025-12-01', completion_date: null },
      { id: 'd2', orm_plan_id: 'mock-orm-1', deliverable_type: 'PREVENTIVE_MAINTENANCE', workflow_stage: 'IN_PROGRESS', progress_percentage: 45, estimated_hours: 200, actual_hours: 90, start_date: '2026-01-10', completion_date: null },
      { id: 'd3', orm_plan_id: 'mock-orm-1', deliverable_type: 'BOM_DEVELOPMENT', workflow_stage: 'QAQC_REVIEW', progress_percentage: 72, estimated_hours: 80, actual_hours: 55, start_date: '2026-01-15', completion_date: null },
      { id: 'd4', orm_plan_id: 'mock-orm-1', deliverable_type: 'OPERATING_SPARES', workflow_stage: 'IN_PROGRESS', progress_percentage: 30, estimated_hours: 60, actual_hours: 18, start_date: '2026-02-01', completion_date: null },
      { id: 'd5', orm_plan_id: 'mock-orm-1', deliverable_type: 'IMS_UPDATE', workflow_stage: 'APPROVED', progress_percentage: 100, estimated_hours: 40, actual_hours: 38, start_date: '2025-12-15', completion_date: '2026-02-20' },
    ],
  },
  {
    id: 'mock-orm-2',
    project_id: 'mock-proj-2',
    orm_lead_id: 'mock-lead-2',
    status: 'ACTIVE',
    overall_progress: 35,
    scope_description: 'IMS development for Marjan increment',
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-03-10T09:00:00Z',
    estimated_completion_date: '2026-12-15',
    project: { project_title: 'Marjan Increment III', project_id_prefix: 'MRJ', project_id_number: '0118' },
    deliverables: [
      { id: 'd6', orm_plan_id: 'mock-orm-2', deliverable_type: 'ASSET_REGISTER', workflow_stage: 'IN_PROGRESS', progress_percentage: 50, estimated_hours: 150, actual_hours: 72, start_date: '2026-02-01', completion_date: null },
      { id: 'd7', orm_plan_id: 'mock-orm-2', deliverable_type: 'PREVENTIVE_MAINTENANCE', workflow_stage: 'IN_PROGRESS', progress_percentage: 20, estimated_hours: 180, actual_hours: 35, start_date: '2026-02-15', completion_date: null },
      { id: 'd8', orm_plan_id: 'mock-orm-2', deliverable_type: 'PM_ACTIVATION', workflow_stage: 'IN_PROGRESS', progress_percentage: 10, estimated_hours: 100, actual_hours: 10, start_date: '2026-03-01', completion_date: null },
    ],
  },
  {
    id: 'mock-orm-3',
    project_id: 'mock-proj-3',
    orm_lead_id: 'mock-lead-1',
    status: 'ACTIVE',
    overall_progress: 88,
    scope_description: 'CMMS finalization and PM activation for Berri gas plant',
    created_at: '2025-08-10T08:00:00Z',
    updated_at: '2026-03-05T11:00:00Z',
    estimated_completion_date: '2026-04-30',
    project: { project_title: 'Berri Gas Plant Debottleneck', project_id_prefix: 'BRI', project_id_number: '0091' },
    deliverables: [
      { id: 'd9', orm_plan_id: 'mock-orm-3', deliverable_type: 'ASSET_REGISTER', workflow_stage: 'APPROVED', progress_percentage: 100, estimated_hours: 90, actual_hours: 88, start_date: '2025-09-01', completion_date: '2026-01-10' },
      { id: 'd10', orm_plan_id: 'mock-orm-3', deliverable_type: 'PREVENTIVE_MAINTENANCE', workflow_stage: 'APPROVED', progress_percentage: 100, estimated_hours: 160, actual_hours: 155, start_date: '2025-10-01', completion_date: '2026-02-15' },
      { id: 'd11', orm_plan_id: 'mock-orm-3', deliverable_type: 'BOM_DEVELOPMENT', workflow_stage: 'CENTRAL_TEAM_REVIEW', progress_percentage: 90, estimated_hours: 70, actual_hours: 63, start_date: '2025-11-01', completion_date: null },
      { id: 'd12', orm_plan_id: 'mock-orm-3', deliverable_type: 'OPERATING_SPARES', workflow_stage: 'APPROVED', progress_percentage: 100, estimated_hours: 50, actual_hours: 48, start_date: '2025-11-15', completion_date: '2026-02-28' },
      { id: 'd13', orm_plan_id: 'mock-orm-3', deliverable_type: 'IMS_UPDATE', workflow_stage: 'LEAD_REVIEW', progress_percentage: 75, estimated_hours: 45, actual_hours: 33, start_date: '2026-01-01', completion_date: null },
      { id: 'd14', orm_plan_id: 'mock-orm-3', deliverable_type: 'PM_ACTIVATION', workflow_stage: 'IN_PROGRESS', progress_percentage: 60, estimated_hours: 80, actual_hours: 48, start_date: '2026-02-01', completion_date: null },
    ],
  },
  {
    id: 'mock-orm-4',
    project_id: 'mock-proj-4',
    orm_lead_id: 'mock-lead-2',
    status: 'COMPLETED',
    overall_progress: 100,
    scope_description: 'Complete CMMS & IMS for Haradh water injection',
    created_at: '2025-03-01T08:00:00Z',
    updated_at: '2025-12-20T16:00:00Z',
    estimated_completion_date: '2025-12-31',
    project: { project_title: 'Haradh Water Injection', project_id_prefix: 'HRD', project_id_number: '0067' },
    deliverables: [
      { id: 'd15', orm_plan_id: 'mock-orm-4', deliverable_type: 'ASSET_REGISTER', workflow_stage: 'APPROVED', progress_percentage: 100, estimated_hours: 100, actual_hours: 95, start_date: '2025-04-01', completion_date: '2025-08-15' },
      { id: 'd16', orm_plan_id: 'mock-orm-4', deliverable_type: 'PREVENTIVE_MAINTENANCE', workflow_stage: 'APPROVED', progress_percentage: 100, estimated_hours: 140, actual_hours: 138, start_date: '2025-05-01', completion_date: '2025-10-30' },
      { id: 'd17', orm_plan_id: 'mock-orm-4', deliverable_type: 'BOM_DEVELOPMENT', workflow_stage: 'APPROVED', progress_percentage: 100, estimated_hours: 60, actual_hours: 58, start_date: '2025-06-01', completion_date: '2025-09-15' },
      { id: 'd18', orm_plan_id: 'mock-orm-4', deliverable_type: 'PM_ACTIVATION', workflow_stage: 'APPROVED', progress_percentage: 100, estimated_hours: 70, actual_hours: 68, start_date: '2025-09-01', completion_date: '2025-12-10' },
    ],
  },
  {
    id: 'mock-orm-5',
    project_id: 'mock-proj-5',
    orm_lead_id: 'mock-lead-3',
    status: 'ACTIVE',
    overall_progress: 15,
    scope_description: 'New CMMS build for Jafurah unconventional gas',
    created_at: '2026-02-20T08:00:00Z',
    updated_at: '2026-03-10T08:00:00Z',
    estimated_completion_date: '2027-06-30',
    project: { project_title: 'Jafurah Gas Development', project_id_prefix: 'JFR', project_id_number: '0203' },
    deliverables: [
      { id: 'd19', orm_plan_id: 'mock-orm-5', deliverable_type: 'ASSET_REGISTER', workflow_stage: 'IN_PROGRESS', progress_percentage: 25, estimated_hours: 200, actual_hours: 50, start_date: '2026-03-01', completion_date: null },
      { id: 'd20', orm_plan_id: 'mock-orm-5', deliverable_type: 'PREVENTIVE_MAINTENANCE', workflow_stage: 'IN_PROGRESS', progress_percentage: 5, estimated_hours: 250, actual_hours: 12, start_date: '2026-03-05', completion_date: null },
    ],
  },
];

export const useORMPlans = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['orm-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orm_plans')
        .select(`
          *,
          project:projects(project_title, project_id_prefix, project_id_number),
          deliverables:orm_deliverables(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Return mock data if no real data exists
      if (!data || data.length === 0) {
        return MOCK_ORM_PLANS as any;
      }
      
      return data;
    }
  });

  const createPlan = useMutation({
    mutationFn: async (data: {
      project_id: string;
      orm_lead_id: string;
      scope_description?: string;
      estimated_completion_date?: string;
      deliverables: Array<{
        deliverable_type: 'ASSET_REGISTER' | 'PREVENTIVE_MAINTENANCE' | 'BOM_DEVELOPMENT' | 'OPERATING_SPARES' | 'IMS_UPDATE' | 'PM_ACTIVATION';
        assigned_resource_id?: string;
      }>;
    }) => {
      // Get current user if available, otherwise use null
      const { data: { user } } = await supabase.auth.getUser();
      const created_by = user?.id || null;

      // Create plan
      const { data: plan, error: planError } = await supabase
        .from('orm_plans')
        .insert({
          project_id: data.project_id,
          orm_lead_id: data.orm_lead_id,
          scope_description: data.scope_description,
          estimated_completion_date: data.estimated_completion_date,
          created_by: created_by
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create deliverables
      if (data.deliverables.length > 0) {
        const { error: delError } = await supabase
          .from('orm_deliverables')
          .insert(
            data.deliverables.map(d => ({
              orm_plan_id: plan.id,
              deliverable_type: d.deliverable_type,
              assigned_resource_id: d.assigned_resource_id
            }))
          );

        if (delError) throw delError;
      }

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-plans'] });
      toast({
        title: 'Success',
        description: 'ORM plan created successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    plans,
    isLoading,
    createPlan: createPlan.mutate,
    isCreating: createPlan.isPending
  };
};

export const useORMPlanDetails = (planId: string) => {
  return useQuery({
    queryKey: ['orm-plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orm_plans')
        .select(`
          *,
          project:projects(*),
          deliverables:orm_deliverables(*),
          reports:orm_daily_reports(*)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!planId
  });
};
