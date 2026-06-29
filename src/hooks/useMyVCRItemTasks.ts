import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatVcrItemCode } from '@/lib/vcrItemCode';

export interface MyVCRItemTaskRow {
  role: 'delivering' | 'approving';
  project_id: string;
  project_code: string | null;
  project_title: string | null;
  handover_point_id: string;
  vcr_code: string;
  vcr_name: string;
  vcr_item_id: string;
  prerequisite_id: string | null;
  category_code: string;
  category_name: string;
  display_order: number | null;
  topic: string | null;
  vcr_item: string;
  status: string;
}

export interface MyVCRItemTaskGroup {
  role: 'delivering' | 'approving';
  projectId: string;
  projectCode: string | null;
  projectTitle: string | null;
  items: MyVCRItemTaskRow[];
}

export const useMyVCRItemTasks = () => {
  return useQuery({
    queryKey: ['my-vcr-item-tasks'],
    queryFn: async (): Promise<MyVCRItemTaskRow[]> => {
      const { data, error } = await (supabase as any).rpc('get_my_vcr_item_tasks');
      if (error) throw error;
      return (data || []) as MyVCRItemTaskRow[];
    },
    staleTime: 30_000,
  });
};

/** Compose the canonical itemCode for a row, matching the sheet's source-of-truth. */
export const vcrItemRowCode = (r: MyVCRItemTaskRow): string =>
  formatVcrItemCode(r.category_code, r.display_order);
