import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type VCRHCStatus = 'HC' | 'NON_HC' | 'UNKNOWN';

export interface VCRHydrocarbonStatus {
  status: VCRHCStatus;
  systemCount: number;
  hasHydrocarbon: boolean;
}

/**
 * Single source of truth for a VCR's hydrocarbon classification, derived
 * from the systems linked to the handover point. Cached by react-query so
 * header + step content share one fetch per VCR id.
 */
export function useVCRHydrocarbonStatus(vcrId: string | undefined) {
  return useQuery<VCRHydrocarbonStatus>({
    queryKey: ['vcr-hc-status', vcrId],
    enabled: !!vcrId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: linked, error: lsErr } = await supabase
        .from('p2a_handover_point_systems')
        .select('system_id')
        .eq('handover_point_id', vcrId!);
      if (lsErr) throw lsErr;

      const systemCount = linked?.length ?? 0;
      if (systemCount === 0) {
        return { status: 'UNKNOWN', systemCount: 0, hasHydrocarbon: false };
      }

      const ids = linked!.map(r => r.system_id);
      const { data: hc, error: sErr } = await supabase
        .from('p2a_systems')
        .select('is_hydrocarbon')
        .in('id', ids)
        .eq('is_hydrocarbon', true)
        .limit(1);
      if (sErr) throw sErr;

      const hasHydrocarbon = (hc?.length ?? 0) > 0;
      return {
        status: hasHydrocarbon ? 'HC' : 'NON_HC',
        systemCount,
        hasHydrocarbon,
      };
    },
  });
}
