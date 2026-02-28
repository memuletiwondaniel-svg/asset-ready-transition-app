import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemITPActivity {
  id: string;
  activity_name: string;
  inspection_type: string;
  display_order: number;
  notes: string | null;
  ora_status: string;
  ora_completion_percentage: number;
}

export const useSystemITPActivities = (handoverPointId: string, systemId: string, enabled = true) => {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['system-itp-activities', handoverPointId, systemId],
    enabled: enabled && !!handoverPointId && !!systemId,
    queryFn: async () => {
      // Fetch ITP activities for this system + VCR
      const { data: itpData, error: itpError } = await supabase
        .from('p2a_itp_activities')
        .select('id, activity_name, inspection_type, display_order, notes')
        .eq('handover_point_id', handoverPointId)
        .eq('system_id', systemId)
        .order('display_order');

      if (itpError) throw itpError;
      if (!itpData?.length) return [];

      // Fetch ORA plan activity statuses for these ITP activities
      const itpIds = itpData.map(a => a.id);
      const { data: oraData } = await supabase
        .from('ora_plan_activities')
        .select('source_ref_id, status, completion_percentage')
        .eq('source_ref_table', 'p2a_itp_activities')
        .in('source_ref_id', itpIds);

      const oraMap = new Map(
        (oraData || []).map(o => [o.source_ref_id, o])
      );

      return itpData.map(itp => {
        const ora = oraMap.get(itp.id);
        return {
          id: itp.id,
          activity_name: itp.activity_name,
          inspection_type: itp.inspection_type,
          display_order: itp.display_order,
          notes: itp.notes,
          ora_status: ora?.status || 'NOT_STARTED',
          ora_completion_percentage: ora?.completion_percentage || 0,
        } as SystemITPActivity;
      });
    },
  });

  return { activities, isLoading };
};
