import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VCRPlanApprovalEvent {
  id: string;
  handover_point_id: string;
  actor_id: string | null;
  actor_name?: string | null;
  event_type: 'SUBMITTED' | 'EDIT' | 'APPROVED' | 'REJECTED' | 'BASELINED' | 'SCOPE_VOIDED';
  payload: any;
  created_at: string;
}

export function useVCRPlanApprovalEvents(handoverPointId: string | null | undefined) {
  return useQuery({
    queryKey: ['vcr-plan-approval-events', handoverPointId],
    enabled: !!handoverPointId,
    queryFn: async (): Promise<VCRPlanApprovalEvent[]> => {
      const { data, error } = await (supabase as any)
        .from('vcr_plan_approval_events')
        .select('id, handover_point_id, actor_id, event_type, payload, created_at')
        .eq('handover_point_id', handoverPointId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const events = (data || []) as VCRPlanApprovalEvent[];

      // Resolve actor names
      const actorIds = Array.from(new Set(events.map((e) => e.actor_id).filter(Boolean))) as string[];
      let nameMap: Record<string, string> = {};
      if (actorIds.length > 0) {
        const { data: profs } = await (supabase as any)
          .from('profiles')
          .select('user_id, full_name, first_name, last_name')
          .in('user_id', actorIds);
        (profs || []).forEach((p: any) => {
          nameMap[p.user_id] =
            p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
        });
      }
      return events.map((e) => ({ ...e, actor_name: e.actor_id ? nameMap[e.actor_id] || null : null }));
    },
  });
}
