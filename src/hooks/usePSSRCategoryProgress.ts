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
      // Fetch all active categories
      const { data: categories, error: catError } = await supabase
        .from('pssr_checklist_categories')
        .select('id, name, ref_id, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (catError) throw catError;

      // Fetch checklist responses with their item categories for this PSSR
      const { data: responses, error: respError } = await supabase
        .from('pssr_checklist_responses')
        .select(`
          id,
          status,
          response,
          checklist_item_id,
          pssr_checklist_items!inner(
            category
          )
        `)
        .eq('pssr_id', pssrId);

      if (respError) throw respError;

      // Count items per category — keyed by category ID (UUID) since checklist_items.category stores UUIDs
      const categoryStats: Record<string, { total: number; completed: number }> = {};
      
      // Initialize all categories by ID
      categories?.forEach(cat => {
        categoryStats[cat.id] = { total: 0, completed: 0 };
      });

      // Count responses by category (UUID match)
      responses?.forEach((resp: any) => {
        const categoryId = resp.pssr_checklist_items?.category;
        if (categoryId && categoryStats[categoryId] !== undefined) {
          categoryStats[categoryId].total++;
          // Consider 'approved' or responses with 'YES'/'NA' as completed
          if (resp.status === 'approved' || resp.response === 'YES' || resp.response === 'NA') {
            categoryStats[categoryId].completed++;
          }
        }
      });

      // Build category progress array
      const categoryProgress: CategoryProgress[] = (categories || [])
        .filter(cat => categoryStats[cat.id]?.total > 0)
        .map(cat => {
          const stats = categoryStats[cat.id];
          return {
            id: cat.id,
            name: cat.name,
            ref_id: cat.ref_id,
            completed: stats.completed,
            total: stats.total,
            percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
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

      // Fetch checklist responses for this PSSR filtered by category
      const { data: responses, error } = await supabase
        .from('pssr_checklist_responses')
        .select(`
          id,
          status,
          response,
          narrative,
          attachments,
          deviation_reason,
          potential_risk,
          mitigations,
          follow_up_action,
          action_owner,
          justification,
          created_at,
          checklist_item_id,
          pssr_checklist_items!inner(
            id,
            unique_id,
            question,
            category
          )
        `)
        .eq('pssr_id', pssrId);

      if (error) throw error;

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

      // Filter by category and transform
      const items: CategoryItem[] = (responses || [])
        .filter((resp: any) => resp.pssr_checklist_items?.category === categoryName)
        .map((resp: any) => {
          const approval = approvalMap.get(resp.id);
          return {
            id: resp.pssr_checklist_items.id,
            unique_id: resp.pssr_checklist_items.unique_id,
            question: resp.pssr_checklist_items.question,
            response_id: resp.id,
            response: resp.response,
            status: resp.status,
            approval_status: approval?.status || null,
            narrative: resp.narrative,
            category: resp.pssr_checklist_items.category,
            // Extended fields
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
            attachments: resp.attachments || null,
          };
        })
        .sort((a: CategoryItem, b: CategoryItem) => a.unique_id.localeCompare(b.unique_id));

      return items;
    },
    enabled: !!pssrId && !!categoryName,
  });
}
