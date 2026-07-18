import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'maintenance-attachments';

export interface MaintBatch {
  id: string;
  deliverable_id: string;
  seq: number;
  name: string;
  item_count: number;
  status: 'NOT_STARTED' | 'DRAFT' | 'QAQC_IN_PROGRESS' | 'UPLOAD_IN_PROGRESS' | 'COMPLETE';
  approved_by: string | null;
  approved_at: string | null;
  load_file_path: string | null;
  upload_confirmation_path: string | null;
  approver_name?: string | null;
  approver_avatar_url?: string | null;
  load_file_url?: string | null;
  upload_confirmation_url?: string | null;
}

export interface MaintSpare {
  id: string;
  material_no: string;
  material_name: string;
  qty_ordered: number;
  pr_no: string | null;
  po_no: string | null;
  delivered: boolean;
  display_order: number;
}

export interface MaintDeliverable {
  id: string;
  handover_point_id: string;
  deliverable_key: string; // ASSET_REGISTER_BUILD | PM_ROUTINES | BOM | SPARES_2Y | RISKPOYNT | IMS
  display_name: string | null;
  deliverable_type: string;
  is_applicable: boolean;
  cmms_lead_id: string | null;
  central_mtce_lead_id: string | null;
  cmms_lead?: { full_name: string | null; avatar_url: string | null } | null;
  central_mtce_lead?: { full_name: string | null; avatar_url: string | null } | null;
  batches: MaintBatch[];
  spares: MaintSpare[];
  percent: number;
}

export const KIND_META: Record<string, { label: string; isSpares: boolean }> = {
  ASSET_REGISTER_BUILD: { label: 'Asset Register Build', isSpares: false },
  PM_ROUTINES: { label: 'PM Routines', isSpares: false },
  BOM: { label: 'Bill of Materials', isSpares: false },
  SPARES_2Y: { label: '2Y Operating Spares', isSpares: true },
  RISKPOYNT: { label: 'RiskPoynt Update', isSpares: false },
  IMS: { label: 'IMS Update', isSpares: false },
};

const resolveUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
};

const percentBatches = (batches: MaintBatch[]) => {
  const total = batches.reduce((sum, b) => sum + (b.item_count || 0), 0);
  if (total === 0) return 0;
  const done = batches
    .filter((b) => b.status === 'COMPLETE')
    .reduce((sum, b) => sum + (b.item_count || 0), 0);
  return Math.round((done / total) * 100);
};

const percentSpares = (spares: MaintSpare[]) => {
  if (spares.length === 0) return 0;
  const d = spares.filter((s) => s.delivered).length;
  return Math.round((d / spares.length) * 100);
};

export function useMaintenanceDeliverables(handoverPointId: string) {
  return useQuery<MaintDeliverable[]>({
    queryKey: ['vcr-maintenance-full', handoverPointId],
    enabled: !!handoverPointId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      const { data: rows, error } = await client
        .from('p2a_vcr_maintenance_deliverables')
        .select('id, handover_point_id, deliverable_type, is_applicable, cmms_lead_id, central_mtce_lead_id, deliverable_key, display_name')
        .eq('handover_point_id', handoverPointId)
        .eq('is_applicable', true);
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list = (rows || []) as any[];
      if (list.length === 0) return [];

      const ids = list.map((r) => r.id);
      const [{ data: batches }, { data: spares }] = await Promise.all([
        client.from('p2a_vcr_maint_batches').select('*').in('deliverable_id', ids).order('seq'),
        client.from('p2a_vcr_maint_spares').select('*').in('deliverable_id', ids).order('display_order'),
      ]);

      const uids = new Set<string>();
      list.forEach((r) => {
        if (r.cmms_lead_id) uids.add(r.cmms_lead_id);
        if (r.central_mtce_lead_id) uids.add(r.central_mtce_lead_id);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (batches || []).forEach((b: any) => b.approved_by && uids.add(b.approved_by));

      let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (uids.size > 0) {
        const { data: profiles } = await client
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', Array.from(uids));
        profileMap = new Map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (profiles || []).map((p: any) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }]),
        );
      }

      return list.map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dvBatches: MaintBatch[] = ((batches || []) as any[])
          .filter((b) => b.deliverable_id === r.id)
          .map((b) => ({
            ...b,
            approver_name: b.approved_by ? profileMap.get(b.approved_by)?.full_name ?? null : null,
            approver_avatar_url: b.approved_by ? profileMap.get(b.approved_by)?.avatar_url ?? null : null,
            load_file_url: resolveUrl(b.load_file_path),
            upload_confirmation_url: resolveUrl(b.upload_confirmation_path),
          }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dvSpares: MaintSpare[] = ((spares || []) as any[])
          .filter((s) => s.deliverable_id === r.id);
        const key = r.deliverable_key || r.deliverable_type;
        const isSpares = KIND_META[key]?.isSpares || key === 'SPARES_2Y' || key === 'SPARES';
        const percent = isSpares ? percentSpares(dvSpares) : percentBatches(dvBatches);
        return {
          ...r,
          deliverable_key: key,
          display_name: r.display_name || KIND_META[key]?.label || r.deliverable_type,
          cmms_lead: r.cmms_lead_id ? profileMap.get(r.cmms_lead_id) ?? null : null,
          central_mtce_lead: r.central_mtce_lead_id ? profileMap.get(r.central_mtce_lead_id) ?? null : null,
          batches: dvBatches,
          spares: dvSpares,
          percent,
        } as MaintDeliverable;
      });
    },
  });
}
