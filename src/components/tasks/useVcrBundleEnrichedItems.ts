import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import type { VCRBundleTask, VCRSubItem } from '@/hooks/useUserVCRBundleTasks';
import { formatVcrItemCode } from '@/lib/vcrItemCode';
import type { PrereqStatus } from '@/components/p2a-workspace/handover-points/vcr-standard/standardStatus';

/**
 * Shared enrichment for both VCR bundle panels.
 *
 * Bundle sub_items only carry {prerequisite_id, summary, completed}.
 * The panels need per-row: item code, category, question text, prereq
 * status (delivering panel), and this-approver ledger status (approver
 * panel). One query per bundle, keyed by prereq ids so React Query
 * cache-shares with the drawer's own reads.
 */

export interface VCRBundleEnrichedItem {
  prerequisite_id: string;
  vcr_item_id: string | null;
  handover_point_id: string;
  summary: string;
  vcr_item_text: string;
  topic: string | null;
  item_code: string;
  category_code: string;
  category_name: string;
  status: PrereqStatus;
  delivering_party_id: string | null;
  delivering_party_name: string | null;
  submitted_at: string | null;
  completed_from_bundle: boolean;
  ledger_status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'QUALIFIED' | 'SUPERSEDED' | null;
}

export function useVcrBundleEnrichedItems(bundle: VCRBundleTask | null, opts: { forApprover: boolean }) {
  const { user } = useAuth();
  const subItems: VCRSubItem[] = bundle?.sub_items || [];
  const prereqIds = subItems
    .map((s) => s.prerequisite_id)
    .filter((x): x is string => !!x);

  return useQuery({
    enabled: !!bundle && prereqIds.length > 0 && (!opts.forApprover || !!user?.id),
    queryKey: ['vcr-bundle-enriched', bundle?.id, prereqIds, opts.forApprover ? user?.id : 'delivering'],
    queryFn: async (): Promise<VCRBundleEnrichedItem[]> => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_prerequisites')
        .select(`
          id,
          handover_point_id,
          summary,
          status,
          delivering_party_id,
          delivering_party_name,
          submitted_at,
          vcr_item_id,
          vcr_items:vcr_item_id (
            id,
            vcr_item,
            topic,
            display_order,
            category:category_id ( code, name )
          )
        `)
        .in('id', prereqIds);
      if (error) throw error;

      let ledgerMap: Record<string, 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'QUALIFIED'> = {};
      if (opts.forApprover && user?.id) {
        const { data: led, error: le } = await (supabase as any)
          .from('vcr_prerequisite_approvals')
          .select('prerequisite_id, status')
          .in('prerequisite_id', prereqIds)
          .eq('approver_user_id', user.id);
        if (le) throw le;
        (led || []).forEach((r: any) => { ledgerMap[r.prerequisite_id] = r.status; });
      }

      const bundleCompleted = new Map<string, boolean>(
        subItems.map((s) => [s.prerequisite_id || '', !!s.completed]),
      );
      const bundleSummary = new Map<string, string>(
        subItems.map((s) => [s.prerequisite_id || '', s.summary || '']),
      );

      return (data || []).map((row: any): VCRBundleEnrichedItem => {
        const vcrItem = row.vcr_items || {};
        const category = vcrItem.category || {};
        const catCode = category.code || 'XX';
        const displayOrder = vcrItem.display_order ?? null;
        return {
          prerequisite_id: row.id,
          vcr_item_id: row.vcr_item_id ?? null,
          handover_point_id: row.handover_point_id,
          summary: row.summary || bundleSummary.get(row.id) || '',
          vcr_item_text: vcrItem.vcr_item || row.summary || '',
          topic: vcrItem.topic ?? null,
          item_code: formatVcrItemCode(catCode, displayOrder),
          category_code: catCode,
          category_name: category.name || catCode,
          status: (row.status || 'NOT_STARTED') as PrereqStatus,
          delivering_party_id: row.delivering_party_id ?? null,
          delivering_party_name: row.delivering_party_name ?? null,
          submitted_at: row.submitted_at ?? null,
          completed_from_bundle: !!bundleCompleted.get(row.id),
          ledger_status: ledgerMap[row.id] ?? null,
        };
      });
    },
    staleTime: 15_000,
  });
}
