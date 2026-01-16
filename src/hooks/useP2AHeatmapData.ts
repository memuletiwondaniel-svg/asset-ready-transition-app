import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeatmapCellData {
  handoverId: string;
  categoryId: string;
  status: string;
  completionPercentage: number;
  deliverableCount: number;
  completedCount: number;
  latestComment?: string;
  lastUpdated?: string;
  categoryName?: string;
}

export type HeatmapDataMap = Map<string, HeatmapCellData>;

const getAggregatedStatus = (statuses: string[]): string => {
  if (statuses.length === 0) return 'NOT_STARTED';
  
  const hasOverdue = statuses.some(s => s === 'BEHIND_SCHEDULE' || s === 'OVERDUE');
  const hasInProgress = statuses.some(s => s === 'IN_PROGRESS');
  const allCompleted = statuses.every(s => s === 'COMPLETED');
  const allNotApplicable = statuses.every(s => s === 'NOT_APPLICABLE');
  const allNotStarted = statuses.every(s => s === 'NOT_STARTED');
  
  if (allNotApplicable) return 'NOT_APPLICABLE';
  if (allCompleted) return 'COMPLETED';
  if (allNotStarted) return 'NOT_STARTED';
  if (hasOverdue) return 'BEHIND_SCHEDULE';
  if (hasInProgress) return 'IN_PROGRESS';
  
  return 'IN_PROGRESS';
};

export const useP2AHeatmapData = () => {
  const { data: heatmapData, isLoading } = useQuery({
    queryKey: ['p2a-heatmap-data'],
    queryFn: async () => {
      // Fetch all deliverables with category info
      const { data: deliverables, error } = await supabase
        .from('p2a_handover_deliverables')
        .select(`
          id,
          handover_id,
          category_id,
          status,
          comments,
          updated_at,
          category:p2a_deliverable_categories(name)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Group by handover_id + category_id
      const groupedData = new Map<string, {
        statuses: string[];
        comments: string[];
        lastUpdated: string;
        categoryName: string;
        count: number;
        completedCount: number;
      }>();

      deliverables?.forEach((deliverable) => {
        const key = `${deliverable.handover_id}-${deliverable.category_id}`;
        const existing = groupedData.get(key);
        
        const isCompleted = deliverable.status === 'COMPLETED';
        const categoryName = (deliverable.category as any)?.name || '';
        
        if (existing) {
          existing.statuses.push(deliverable.status);
          if (deliverable.comments) {
            existing.comments.push(deliverable.comments);
          }
          existing.count++;
          if (isCompleted) existing.completedCount++;
          // Keep the most recent update
          if (new Date(deliverable.updated_at) > new Date(existing.lastUpdated)) {
            existing.lastUpdated = deliverable.updated_at;
          }
        } else {
          groupedData.set(key, {
            statuses: [deliverable.status],
            comments: deliverable.comments ? [deliverable.comments] : [],
            lastUpdated: deliverable.updated_at,
            categoryName,
            count: 1,
            completedCount: isCompleted ? 1 : 0,
          });
        }
      });

      // Convert to HeatmapDataMap
      const result: HeatmapDataMap = new Map();
      
      groupedData.forEach((group, key) => {
        const [handoverId, categoryId] = key.split('-');
        const completionPercentage = group.count > 0 
          ? Math.round((group.completedCount / group.count) * 100) 
          : 0;
        
        result.set(key, {
          handoverId,
          categoryId,
          status: getAggregatedStatus(group.statuses),
          completionPercentage,
          deliverableCount: group.count,
          completedCount: group.completedCount,
          latestComment: group.comments[0], // Most recent comment
          lastUpdated: group.lastUpdated,
          categoryName: group.categoryName,
        });
      });

      return result;
    }
  });

  return {
    heatmapData: heatmapData || new Map(),
    isLoading
  };
};

