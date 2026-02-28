import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Cross-references VCR deliverable items with ORA plan activities
 * to provide execution status for each item.
 */

export interface VCRDeliverableStatus {
  ora_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  ora_completion_percentage: number;
  ora_activity_id: string | null;
  task_id: string | null;
}

export interface VCRTrainingDeliverable {
  id: string;
  title: string;
  description: string | null;
  target_audience: string[];
  training_provider: string | null;
  duration_hours: number | null;
  tentative_date: string | null;
  estimated_cost: number | null;
  status: string;
  display_order: number;
  delivery_method: string[] | null;
  system_ids: string[];
  created_at: string;
  // ORA execution status
  ora: VCRDeliverableStatus;
}

export interface VCRProcedureDeliverable {
  id: string;
  title: string;
  procedure_type: string;
  description: string | null;
  responsible_person: string | null;
  target_date: string | null;
  status: string;
  display_order: number;
  created_at: string;
  ora: VCRDeliverableStatus;
}

export interface VCRRegisterDeliverable {
  id: string;
  title: string;
  description: string | null;
  responsible_person: string | null;
  target_date: string | null;
  status: string;
  display_order: number;
  created_at: string;
  ora: VCRDeliverableStatus;
}

export interface VCRGeneralDeliverable {
  id: string;
  title: string;
  tier: string;
  description: string | null;
  responsible_person: string | null;
  target_date: string | null;
  status: string;
  display_order: number;
  created_at: string;
  ora: VCRDeliverableStatus;
}

const DEFAULT_ORA: VCRDeliverableStatus = {
  ora_status: 'NOT_STARTED',
  ora_completion_percentage: 0,
  ora_activity_id: null,
  task_id: null,
};

/**
 * Fetches ORA plan activity statuses for a set of source items
 */
async function fetchORAStatuses(
  sourceIds: string[],
  sourceRefTable: string
): Promise<Record<string, VCRDeliverableStatus>> {
  if (sourceIds.length === 0) return {};

  const client = supabase as any;
  const { data } = await client
    .from('ora_plan_activities')
    .select('source_ref_id, status, completion_percentage, id, task_id')
    .eq('source_ref_table', sourceRefTable)
    .in('source_ref_id', sourceIds);

  const map: Record<string, VCRDeliverableStatus> = {};
  (data || []).forEach((a: any) => {
    map[a.source_ref_id] = {
      ora_status: a.status || 'NOT_STARTED',
      ora_completion_percentage: a.completion_percentage || 0,
      ora_activity_id: a.id,
      task_id: a.task_id,
    };
  });
  return map;
}

/**
 * Hook: Fetch training deliverables from VCR Execution Plan
 */
export function useVCRTrainingDeliverables(handoverPointId: string) {
  return useQuery({
    queryKey: ['vcr-training-deliverables', handoverPointId],
    queryFn: async (): Promise<VCRTrainingDeliverable[]> => {
      const client = supabase as any;

      const { data, error } = await client
        .from('p2a_vcr_training')
        .select('*')
        .eq('handover_point_id', handoverPointId)
        .order('display_order');

      if (error) throw error;
      if (!data?.length) return [];

      const oraMap = await fetchORAStatuses(
        data.map((d: any) => d.id),
        'p2a_vcr_training'
      );

      return data.map((item: any) => ({
        ...item,
        target_audience: item.target_audience || [],
        system_ids: item.system_ids || [],
        ora: oraMap[item.id] || DEFAULT_ORA,
      }));
    },
    enabled: !!handoverPointId,
  });
}

/**
 * Hook: Fetch procedure deliverables from VCR Execution Plan
 */
export function useVCRProcedureDeliverables(handoverPointId: string) {
  return useQuery({
    queryKey: ['vcr-procedure-deliverables', handoverPointId],
    queryFn: async (): Promise<VCRProcedureDeliverable[]> => {
      const client = supabase as any;

      const { data, error } = await client
        .from('p2a_vcr_procedures')
        .select('*')
        .eq('handover_point_id', handoverPointId)
        .order('display_order');

      if (error) throw error;
      if (!data?.length) return [];

      const oraMap = await fetchORAStatuses(
        data.map((d: any) => d.id),
        'p2a_vcr_procedures'
      );

      return data.map((item: any) => ({
        ...item,
        ora: oraMap[item.id] || DEFAULT_ORA,
      }));
    },
    enabled: !!handoverPointId,
  });
}

/**
 * Hook: Fetch register deliverables from VCR Execution Plan
 */
export function useVCRRegisterDeliverables(handoverPointId: string) {
  return useQuery({
    queryKey: ['vcr-register-deliverables', handoverPointId],
    queryFn: async (): Promise<VCRRegisterDeliverable[]> => {
      const client = supabase as any;

      const { data, error } = await client
        .from('p2a_vcr_operational_registers')
        .select('*')
        .eq('handover_point_id', handoverPointId)
        .order('display_order');

      if (error) throw error;
      if (!data?.length) return [];

      const oraMap = await fetchORAStatuses(
        data.map((d: any) => d.id),
        'p2a_vcr_operational_registers'
      );

      return data.map((item: any) => ({
        ...item,
        ora: oraMap[item.id] || DEFAULT_ORA,
      }));
    },
    enabled: !!handoverPointId,
  });
}

/**
 * Hook: Fetch general deliverables (CMMS, Spares, etc.) from VCR Execution Plan
 */
export function useVCRGeneralDeliverables(handoverPointId: string, tier?: string) {
  return useQuery({
    queryKey: ['vcr-general-deliverables', handoverPointId, tier],
    queryFn: async (): Promise<VCRGeneralDeliverable[]> => {
      const client = supabase as any;

      let query = client
        .from('p2a_vcr_deliverables')
        .select('*')
        .eq('handover_point_id', handoverPointId)
        .order('display_order');

      if (tier) {
        query = query.eq('tier', tier);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data?.length) return [];

      const oraMap = await fetchORAStatuses(
        data.map((d: any) => d.id),
        'p2a_vcr_deliverables'
      );

      return data.map((item: any) => ({
        ...item,
        ora: oraMap[item.id] || DEFAULT_ORA,
      }));
    },
    enabled: !!handoverPointId,
  });
}
