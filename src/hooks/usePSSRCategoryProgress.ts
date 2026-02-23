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
      // Try fast path: read persisted category_progress from pssrs table
      const { data: pssr } = await supabase
        .from('pssrs')
        .select('category_progress')
        .eq('id', pssrId)
        .single();

      const persistedProgress = pssr?.category_progress as Record<string, { completed: number; total: number }> | null;

      // Fetch all active categories for name/order lookup (needed for both paths)
      const { data: categories, error: catError } = await supabase
        .from('pssr_checklist_categories')
        .select('id, name, ref_id, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (catError) throw catError;

      // If we have persisted progress with data, use fast path
      if (persistedProgress && Object.keys(persistedProgress).length > 0) {
        const categoryProgress: CategoryProgress[] = (categories || [])
          .filter(cat => persistedProgress[cat.id] && persistedProgress[cat.id].total > 0)
          .map(cat => {
            const p = persistedProgress[cat.id];
            return {
              id: cat.id,
              name: cat.name,
              ref_id: cat.ref_id,
              completed: p.completed,
              total: p.total,
              percentage: p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0,
              display_order: cat.display_order,
            };
          });

        // Add custom categories (keys that don't match standard category UUIDs)
        const standardCatIds = new Set((categories || []).map(c => c.id));
        for (const [key, val] of Object.entries(persistedProgress)) {
          if (!standardCatIds.has(key) && val.total > 0) {
            const displayName = key.includes(':') ? key.split(':').slice(1).join(':').trim() : key;
            categoryProgress.push({
              id: `custom-cat:${key}`,
              name: displayName,
              ref_id: 'OT',
              completed: val.completed,
              total: val.total,
              percentage: val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0,
              display_order: 9999,
            });
          }
        }

        categoryProgress.sort((a, b) => a.display_order - b.display_order);
        return categoryProgress;
      }

      // Fallback: full calculation (same as before)
      const { data: responses, error: respError } = await supabase
        .from('pssr_checklist_responses')
        .select('id, status, response, checklist_item_id')
        .eq('pssr_id', pssrId);

      if (respError) throw respError;

      const allItemIds = [...new Set((responses || []).map(r => r.checklist_item_id).filter(Boolean))];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const standardIds = allItemIds.filter(id => uuidRegex.test(id));
      const customPrefixedIds = allItemIds.filter(id => id.startsWith('custom-'));
      const customUuids = customPrefixedIds
        .map(id => id.replace('custom-', ''))
        .filter(id => uuidRegex.test(id));
      const customNonUuids = customPrefixedIds
        .filter(id => !uuidRegex.test(id.replace('custom-', '')));

      let itemCategoryMap = new Map<string, string>();

      if (standardIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('pssr_checklist_items')
          .select('id, category')
          .in('id', standardIds);
        if (itemsError) throw itemsError;
        (items || []).forEach(i => itemCategoryMap.set(i.id, i.category));
      }

      const customCategoryNames = new Map<string, { name: string; count: number }>();

      if (customUuids.length > 0) {
        const { data: customItems } = await supabase
          .from('pssr_custom_checklist_items')
          .select('id, category')
          .eq('pssr_id', pssrId)
          .in('id', customUuids);
        (customItems || []).forEach(ci => {
          const customKey = `custom-${ci.id}`;
          const virtualCatId = `custom-cat:${ci.category}`;
          itemCategoryMap.set(customKey, virtualCatId);
          const displayName = ci.category.includes(':') ? ci.category.split(':').slice(1).join(':').trim() : ci.category;
          customCategoryNames.set(virtualCatId, { name: displayName, count: 0 });
        });
      }

      if (customNonUuids.length > 0) {
        const { data: allCustomItems } = await supabase
          .from('pssr_custom_checklist_items')
          .select('id, category')
          .eq('pssr_id', pssrId)
          .order('display_order', { ascending: true });
        (allCustomItems || []).forEach((ci, idx) => {
          const legacyKey = customNonUuids[idx];
          if (legacyKey) {
            const virtualCatId = `custom-cat:${ci.category}`;
            itemCategoryMap.set(legacyKey, virtualCatId);
            const displayName = ci.category.includes(':') ? ci.category.split(':').slice(1).join(':').trim() : ci.category;
            customCategoryNames.set(virtualCatId, { name: displayName, count: 0 });
          }
        });
      }

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
        });

      for (const [virtualCatId, info] of customCategoryNames) {
        const total = categoryTotals[virtualCatId] || 0;
        if (total === 0) continue;
        const completed = categoryCompleted[virtualCatId] || 0;
        categoryProgress.push({
          id: virtualCatId,
          name: info.name,
          ref_id: 'OT',
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          display_order: 9999,
        });
      }

      categoryProgress.sort((a, b) => a.display_order - b.display_order);
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
      const standardIds = allItemIds.filter(id => uuidRegex.test(id));
      const customPrefixedIds = allItemIds.filter(id => id.startsWith('custom-'));
      const customUuids = customPrefixedIds.map(id => id.replace('custom-', '')).filter(id => uuidRegex.test(id));
      const customNonUuids = customPrefixedIds.filter(id => !uuidRegex.test(id.replace('custom-', '')));

      let itemMap = new Map<string, any>();
      
      if (standardIds.length > 0) {
        const { data: items } = await supabase
          .from('pssr_checklist_items')
          .select('id, description, category, sequence_number, topic')
          .in('id', standardIds);
        
        const catIds = [...new Set((items || []).map(i => i.category).filter(Boolean))];
        let catNameMap = new Map<string, { name: string; ref_id: string }>();
        if (catIds.length > 0) {
          const { data: cats } = await supabase
            .from('pssr_checklist_categories')
            .select('id, name, ref_id')
            .in('id', catIds);
          catNameMap = new Map((cats || []).map(c => [c.id, { name: c.name, ref_id: c.ref_id }]));
        }
        
        (items || []).forEach(i => {
          const cat = catNameMap.get(i.category);
          itemMap.set(i.id, { ...i, category_name: cat?.name || '', category_ref_id: cat?.ref_id || '' });
        });
      }

      // Fetch custom checklist items for this PSSR (UUID-based)
      if (customUuids.length > 0) {
        const { data: customItems } = await supabase
          .from('pssr_custom_checklist_items')
          .select('id, description, category, display_order, topic')
          .eq('pssr_id', pssrId)
          .in('id', customUuids);
        
        (customItems || []).forEach((ci, idx) => {
          const displayName = ci.category.includes(':') 
            ? ci.category.split(':').slice(1).join(':').trim() 
            : ci.category;
          itemMap.set(`custom-${ci.id}`, {
            ...ci,
            sequence_number: ci.display_order || idx + 1,
            category_name: displayName,
            category_ref_id: 'OT',
          });
        });
      }

      // Handle legacy non-UUID custom items
      if (customNonUuids.length > 0) {
        const { data: allCustomItems } = await supabase
          .from('pssr_custom_checklist_items')
          .select('id, description, category, display_order, topic')
          .eq('pssr_id', pssrId)
          .order('display_order', { ascending: true });
        
        (allCustomItems || []).forEach((ci, idx) => {
          const legacyKey = customNonUuids[idx];
          if (legacyKey) {
            const displayName = ci.category.includes(':') 
              ? ci.category.split(':').slice(1).join(':').trim() 
              : ci.category;
            itemMap.set(legacyKey, {
              ...ci,
              sequence_number: ci.display_order || idx + 1,
              category_name: displayName,
              category_ref_id: 'OT',
            });
          }
        });
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
