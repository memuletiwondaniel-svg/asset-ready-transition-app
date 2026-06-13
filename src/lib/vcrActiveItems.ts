import { supabase } from '@/integrations/supabase/client';

/**
 * SINGLE SOURCE OF TRUTH for "active VCR checklist items" for a given VCR.
 *
 * Active = template items for the resolved (HC | non-HC) template
 *          ∩ vcr_items.is_active = true
 *          MINUS items with a p2a_vcr_item_overrides row where is_na = true.
 *
 * Items WITHOUT an override row are ACTIVE by default (never N/A).
 *
 * This function is used BOTH by Step 10 readiness AND by the submit flow
 * that builds p_items for submit_vcr_plan. They MUST agree.
 */

export const HC_TEMPLATE_ID = '363a831c-edb3-4224-a97f-2e8b11fac2dc';
export const NON_HC_TEMPLATE_ID = '2ebe8392-e404-4655-b9eb-46e4e3cb39e8';

export interface ActiveVcrItem {
  id: string;
  vcr_item: string;
  display_order: number;
}

export interface ActiveVcrItemsResult {
  hasHydrocarbon: boolean;
  templateId: string;
  templateItemCount: number;
  catalogActiveCount: number; // vcr_items.is_active=true ∩ template
  naCount: number;            // is_na=true overrides applicable to those
  activeItems: ActiveVcrItem[];
}

export async function computeActiveVcrItems(vcrId: string): Promise<ActiveVcrItemsResult> {
  const client = supabase as any;

  // 1. Resolve hydrocarbon status from linked systems.
  const { data: linked, error: lErr } = await client
    .from('p2a_handover_point_systems')
    .select('system_id')
    .eq('handover_point_id', vcrId);
  if (lErr) throw lErr;

  const sysIds = (linked || []).map((r: any) => r.system_id).filter(Boolean);
  let hasHydrocarbon = false;
  if (sysIds.length > 0) {
    const { data: sysRows, error: sErr } = await client
      .from('p2a_systems')
      .select('id, is_hydrocarbon')
      .in('id', sysIds);
    if (sErr) throw sErr;
    hasHydrocarbon = (sysRows || []).some((s: any) => s.is_hydrocarbon === true);
  }
  const templateId = hasHydrocarbon ? HC_TEMPLATE_ID : NON_HC_TEMPLATE_ID;

  // 2. Template item ids.
  const { data: tplItems, error: tErr } = await client
    .from('vcr_template_items')
    .select('vcr_item_id')
    .eq('template_id', templateId);
  if (tErr) throw tErr;
  const tplItemIds = (tplItems || []).map((r: any) => r.vcr_item_id).filter(Boolean);

  if (tplItemIds.length === 0) {
    return {
      hasHydrocarbon,
      templateId,
      templateItemCount: 0,
      catalogActiveCount: 0,
      naCount: 0,
      activeItems: [],
    };
  }

  // 3. Active catalog rows + overrides (parallel).
  const [{ data: items, error: iErr }, { data: overrides, error: oErr }] = await Promise.all([
    client
      .from('vcr_items')
      .select('id, vcr_item, display_order')
      .in('id', tplItemIds)
      .eq('is_active', true),
    client
      .from('p2a_vcr_item_overrides')
      .select('vcr_item_id, is_na')
      .eq('handover_point_id', vcrId),
  ]);
  if (iErr) throw iErr;
  if (oErr) throw oErr;

  const naSet = new Set<string>(
    (overrides || []).filter((o: any) => o.is_na === true).map((o: any) => o.vcr_item_id),
  );

  const activeItems: ActiveVcrItem[] = (items || [])
    .filter((it: any) => !naSet.has(it.id))
    .map((it: any) => ({
      id: it.id,
      vcr_item: it.vcr_item,
      display_order: it.display_order ?? 0,
    }));

  return {
    hasHydrocarbon,
    templateId,
    templateItemCount: tplItemIds.length,
    catalogActiveCount: (items || []).length,
    naCount: naSet.size,
    activeItems,
  };
}
