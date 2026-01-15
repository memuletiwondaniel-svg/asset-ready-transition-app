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

      // Count items per category
      const categoryStats: Record<string, { total: number; completed: number }> = {};
      
      // Initialize all categories
      categories?.forEach(cat => {
        categoryStats[cat.name] = { total: 0, completed: 0 };
      });

      // Count responses by category
      responses?.forEach((resp: any) => {
        const categoryName = resp.pssr_checklist_items?.category;
        if (categoryName && categoryStats[categoryName] !== undefined) {
          categoryStats[categoryName].total++;
          // Consider 'approved' or responses with 'YES'/'NA' as completed
          if (resp.status === 'approved' || resp.response === 'YES' || resp.response === 'NA') {
            categoryStats[categoryName].completed++;
          }
        }
      });

      // Build category progress array
      const categoryProgress: CategoryProgress[] = (categories || [])
        .filter(cat => categoryStats[cat.name]?.total > 0)
        .map(cat => {
          const stats = categoryStats[cat.name];
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

      // Fetch item approvals
      const { data: approvals } = await supabase
        .from('pssr_item_approvals')
        .select('checklist_response_id, status')
        .eq('pssr_id', pssrId);

      const approvalMap = new Map(approvals?.map(a => [a.checklist_response_id, a.status]) || []);

      // Filter by category and transform
      const items: CategoryItem[] = (responses || [])
        .filter((resp: any) => resp.pssr_checklist_items?.category === categoryName)
        .map((resp: any) => ({
          id: resp.pssr_checklist_items.id,
          unique_id: resp.pssr_checklist_items.unique_id,
          question: resp.pssr_checklist_items.question,
          response_id: resp.id,
          response: resp.response,
          status: resp.status,
          approval_status: approvalMap.get(resp.id) || null,
          narrative: resp.narrative,
          category: resp.pssr_checklist_items.category,
        }))
        .sort((a: CategoryItem, b: CategoryItem) => a.unique_id.localeCompare(b.unique_id));

      return items;
    },
    enabled: !!pssrId && !!categoryName,
  });
}
