import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryProgress {
  id: string;
  name: string;
  ref_id: string;
  completed: number;
  total: number;
  percentage: number;
  display_order: number;
}

export interface CategoryItem {
  id: string;
  unique_id: string;
  question: string;
  response_id: string | null;
  response: string | null;
  status: string;
  approval_status: string | null;
  narrative: string | null;
  category: string;
  // Extended fields for detail view
  deviation_reason: string | null;
  potential_risk: string | null;
  mitigations: string | null;
  follow_up_action: string | null;
  action_owner: string | null;
  justification: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approver_name: string | null;
  approval_comments: string | null;
  attachments: string[] | null;
}

export function usePSSRCategoryProgress(pssrId: string) {
  return useQuery({
    queryKey: ['pssr-category-progress', pssrId],
    queryFn: async () => {
      // Fetch all active categories for name/order lookup
      const { data: categories, error: catError } = await supabase
        .from('pssr_checklist_categories')
        .select('id, name, ref_id, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (catError) throw catError;

      // Fetch checklist responses for THIS PSSR
      const { data: responses, error: respError } = await supabase
        .from('pssr_checklist_responses')
        .select('id, status, response, checklist_item_id')
        .eq('pssr_id', pssrId);

      if (respError) throw respError;

      // Collect unique checklist_item_ids and fetch their categories separately
      // (checklist_item_id is text, pssr_checklist_items.id is uuid — no FK join available)
      const allItemIds = [...new Set((responses || []).map(r => r.checklist_item_id).filter(Boolean))];
      // Filter out custom items (non-UUID format) that won't exist in pssr_checklist_items
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validItemIds = allItemIds.filter(id => uuidRegex.test(id));
      
      let itemCategoryMap = new Map<string, string>();
      if (validItemIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('pssr_checklist_items')
          .select('id, category')
          .in('id', validItemIds);
        
        if (itemsError) throw itemsError;
        itemCategoryMap = new Map((items || []).map(i => [i.id, i.category]));
      }

      // Count totals and completed per category from actual PSSR responses
      const categoryTotals: Record<string, number> = {};
      const categoryCompleted: Record<string, number> = {};
      (responses || []).forEach((resp: any) => {
        const catId = itemCategoryMap.get(resp.checklist_item_id);
        if (!catId) return;
        categoryTotals[catId] = (categoryTotals[catId] || 0) + 1;
        if (resp.status === 'approved' || resp.response === 'YES' || resp.response === 'NA') {
          categoryCompleted[catId] = (categoryCompleted[catId] || 0) + 1;
        }
      });

      // Build category progress — only categories that have responses for this PSSR
      const categoryProgress: CategoryProgress[] = (categories || [])
        .filter(cat => (categoryTotals[cat.id] || 0) > 0)
        .map(cat => {
          const total = categoryTotals[cat.id] || 0;
          const completed = categoryCompleted[cat.id] || 0;
          return {
            id: cat.id,
            name: cat.name,
            ref_id: cat.ref_id,
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            display_order: cat.display_order,
          };
        })
        .sort((a, b) => a.display_order - b.display_order);

      return categoryProgress;
    },
    enabled: !!pssrId,
  });
}

export function usePSSRCategoryItems(pssrId: string, categoryName: string | null) {
  return useQuery({
    queryKey: ['pssr-category-items', pssrId, categoryName],
    queryFn: async () => {
      if (!categoryName) return [];

      // Fetch checklist responses for this PSSR (no FK join — types differ)
      const { data: responses, error } = await supabase
        .from('pssr_checklist_responses')
        .select(`
          id,
          status,
          response,
          narrative,
          deviation_reason,
          potential_risk,
          mitigations,
          follow_up_action,
          action_owner,
          justification,
          created_at,
          checklist_item_id
        `)
        .eq('pssr_id', pssrId);

      if (error) throw error;

      // Fetch all checklist items referenced by these responses
      const allItemIds = [...new Set((responses || []).map(r => r.checklist_item_id).filter(Boolean))];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validItemIds = allItemIds.filter(id => uuidRegex.test(id));
      let itemMap = new Map<string, any>();
      
      if (validItemIds.length > 0) {
        const { data: items } = await supabase
          .from('pssr_checklist_items')
          .select('id, description, category, sequence_number, topic')
          .in('id', validItemIds);
        
        // Also fetch category names
        const catIds = [...new Set((items || []).map(i => i.category).filter(Boolean))];
        let catNameMap = new Map<string, { name: string; ref_id: string }>();
        if (catIds.length > 0) {
          const { data: cats } = await supabase
            .from('pssr_checklist_categories')
            .select('id, name, ref_id')
            .in('id', catIds);
          catNameMap = new Map((cats || []).map(c => [c.id, { name: c.name, ref_id: c.ref_id }]));
        }
        
        itemMap = new Map((items || []).map(i => {
          const cat = catNameMap.get(i.category);
          return [i.id, { ...i, category_name: cat?.name || '', category_ref_id: cat?.ref_id || '' }];
        }));
      }

      // Fetch item approvals with more details
      const { data: approvals } = await supabase
        .from('pssr_item_approvals')
        .select('checklist_response_id, status, comments, reviewed_at, approver_user_id')
        .eq('pssr_id', pssrId);

      // Fetch approver profiles if we have approvals
      const approverIds = approvals?.map(a => a.approver_user_id).filter(Boolean) || [];
      let profileMap = new Map<string, string>();
      
      if (approverIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', approverIds);
        
        profileMap = new Map(profiles?.map(p => [p.id, p.full_name || 'Unknown']) || []);
      }

      const approvalMap = new Map(approvals?.map(a => [a.checklist_response_id, {
        status: a.status,
        comments: a.comments,
        reviewed_at: a.reviewed_at,
        approver_name: a.approver_user_id ? profileMap.get(a.approver_user_id) || null : null
      }]) || []);

      // Filter by category name and transform
      const items: CategoryItem[] = (responses || [])
        .filter((resp: any) => {
          const item = itemMap.get(resp.checklist_item_id);
          return item?.category_name === categoryName;
        })
        .map((resp: any) => {
          const item = itemMap.get(resp.checklist_item_id);
          const approval = approvalMap.get(resp.id);
          const seqNum = item?.sequence_number || 0;
          const refId = item?.category_ref_id || 'XX';
          const uniqueId = `${refId}-${String(seqNum).padStart(2, '0')}`;
          return {
            id: item?.id || resp.checklist_item_id,
            unique_id: uniqueId,
            question: item?.description || '',
            response_id: resp.id,
            response: resp.response,
            status: resp.status,
            approval_status: approval?.status || null,
            narrative: resp.narrative,
            category: categoryName,
            deviation_reason: resp.deviation_reason || null,
            potential_risk: resp.potential_risk || null,
            mitigations: resp.mitigations || null,
            follow_up_action: resp.follow_up_action || null,
            action_owner: resp.action_owner || null,
            justification: resp.justification || null,
            submitted_at: resp.created_at || null,
            approved_at: approval?.reviewed_at || null,
            approver_name: approval?.approver_name || null,
            approval_comments: approval?.comments || null,
            attachments: null,
          };
        })
        .sort((a: CategoryItem, b: CategoryItem) => a.unique_id.localeCompare(b.unique_id));

      return items;
    },
    enabled: !!pssrId && !!categoryName,
  });
}
