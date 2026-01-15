import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

export interface CostCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

export interface CostLineItem {
  id: string;
  name: string;
  estimatedCost: number;
  actualCost: number;
  committedCost: number;
  targetDate: string | null;
  status: string;
  category: string | null;
}

export interface CategoryCostSummary {
  category: string;
  estimatedCost: number;
  actualCost: number;
  committedCost: number;
  costToGo: number;
  variance: number;
  variancePercent: number;
  items: CostLineItem[];
  phasing: CostPhasing[];
}

export interface CostPhasing {
  period: string;
  month: string;
  year: number;
  amount: number;
  category: string;
  itemName: string;
}

export interface CostSummary {
  totalEstimated: number;
  totalActual: number;
  totalCommitted: number;
  totalCostToGo: number;
  totalVariance: number;
  variancePercent: number;
  byCategory: CategoryCostSummary[];
  phasing: CostPhasing[];
}

// Hook to fetch cost categories
export const useCostCategories = () => {
  return useQuery({
    queryKey: ['ora-cost-categories'],
    queryFn: async (): Promise<CostCategory[]> => {
      const { data, error } = await supabase
        .from('ora_cost_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data || [];
    }
  });
};

// Hook to fetch and aggregate cost data for an ORA plan
export const useORAPlanCosts = (planId: string) => {
  return useQuery({
    queryKey: ['ora-plan-costs', planId],
    queryFn: async (): Promise<CostSummary> => {
      // Fetch deliverables with cost data
      const { data: deliverables, error } = await supabase
        .from('orp_plan_deliverables')
        .select(`
          id,
          estimated_cost,
          actual_cost,
          committed_cost,
          cost_category,
          start_date,
          end_date,
          status,
          deliverable:orp_deliverables_catalog(id, name, phase)
        `)
        .eq('orp_plan_id', planId);

      if (error) throw error;

      // Also fetch training items which have cost data
      const { data: trainingPlans } = await supabase
        .from('ora_training_plans')
        .select(`
          id,
          ora_training_items(
            id,
            title,
            estimated_cost,
            actual_cost,
            scheduled_date,
            execution_stage
          )
        `)
        .eq('ora_plan_id', planId);

      // Aggregate by category
      const categoryMap = new Map<string, CategoryCostSummary>();
      const allPhasing: CostPhasing[] = [];

      // Process deliverables
      deliverables?.forEach((del: any) => {
        const category = del.cost_category || 'Uncategorized';
        const estimated = Number(del.estimated_cost) || 0;
        const actual = Number(del.actual_cost) || 0;
        const committed = Number(del.committed_cost) || 0;

        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category,
            estimatedCost: 0,
            actualCost: 0,
            committedCost: 0,
            costToGo: 0,
            variance: 0,
            variancePercent: 0,
            items: [],
            phasing: []
          });
        }

        const cat = categoryMap.get(category)!;
        cat.estimatedCost += estimated;
        cat.actualCost += actual;
        cat.committedCost += committed;

        cat.items.push({
          id: del.id,
          name: del.deliverable?.name || 'Unknown',
          estimatedCost: estimated,
          actualCost: actual,
          committedCost: committed,
          targetDate: del.end_date,
          status: del.status,
          category
        });

        // Add phasing data if there's a target date
        if (del.end_date && estimated > 0) {
          const date = parseISO(del.end_date);
          const phasingEntry: CostPhasing = {
            period: format(date, 'MMM yyyy'),
            month: format(date, 'MMM'),
            year: date.getFullYear(),
            amount: estimated,
            category,
            itemName: del.deliverable?.name || 'Unknown'
          };
          cat.phasing.push(phasingEntry);
          allPhasing.push(phasingEntry);
        }
      });

      // Process training items - always categorize as Training
      trainingPlans?.forEach((plan: any) => {
        plan.ora_training_items?.forEach((item: any) => {
          const category = 'Training';
          const estimated = Number(item.estimated_cost) || 0;
          const actual = Number(item.actual_cost) || 0;

          if (!categoryMap.has(category)) {
            categoryMap.set(category, {
              category,
              estimatedCost: 0,
              actualCost: 0,
              committedCost: 0,
              costToGo: 0,
              variance: 0,
              variancePercent: 0,
              items: [],
              phasing: []
            });
          }

          const cat = categoryMap.get(category)!;
          cat.estimatedCost += estimated;
          cat.actualCost += actual;

          cat.items.push({
            id: item.id,
            name: item.title,
            estimatedCost: estimated,
            actualCost: actual,
            committedCost: 0,
            targetDate: item.scheduled_date,
            status: item.execution_stage || 'PENDING',
            category
          });

          // Add phasing data
          if (item.scheduled_date && estimated > 0) {
            const date = parseISO(item.scheduled_date);
            const phasingEntry: CostPhasing = {
              period: format(date, 'MMM yyyy'),
              month: format(date, 'MMM'),
              year: date.getFullYear(),
              amount: estimated,
              category,
              itemName: item.title
            };
            cat.phasing.push(phasingEntry);
            allPhasing.push(phasingEntry);
          }
        });
      });

      // Calculate totals and variances
      let totalEstimated = 0;
      let totalActual = 0;
      let totalCommitted = 0;

      categoryMap.forEach((cat) => {
        cat.costToGo = Math.max(0, cat.estimatedCost - cat.actualCost);
        cat.variance = cat.estimatedCost - cat.actualCost;
        cat.variancePercent = cat.estimatedCost > 0 
          ? ((cat.variance / cat.estimatedCost) * 100) 
          : 0;

        totalEstimated += cat.estimatedCost;
        totalActual += cat.actualCost;
        totalCommitted += cat.committedCost;
      });

      const totalCostToGo = Math.max(0, totalEstimated - totalActual);
      const totalVariance = totalEstimated - totalActual;
      const variancePercent = totalEstimated > 0 
        ? ((totalVariance / totalEstimated) * 100) 
        : 0;

      // Sort phasing by date
      allPhasing.sort((a, b) => {
        const dateA = new Date(`${a.month} 1, ${a.year}`);
        const dateB = new Date(`${b.month} 1, ${b.year}`);
        return dateA.getTime() - dateB.getTime();
      });

      return {
        totalEstimated,
        totalActual,
        totalCommitted,
        totalCostToGo,
        totalVariance,
        variancePercent,
        byCategory: Array.from(categoryMap.values()).sort((a, b) => b.estimatedCost - a.estimatedCost),
        phasing: allPhasing
      };
    },
    enabled: !!planId
  });
};

// Hook to update deliverable cost
export const useUpdateDeliverableCost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      deliverableId: string;
      estimated_cost?: number;
      actual_cost?: number;
      committed_cost?: number;
      cost_category?: string;
    }) => {
      const { deliverableId, ...updates } = data;
      const { error } = await supabase
        .from('orp_plan_deliverables')
        .update(updates)
        .eq('id', deliverableId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-plan-costs'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      toast({
        title: 'Cost Updated',
        description: 'Cost information has been saved successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

// Utility function to format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Utility to get variance color class
export const getVarianceColorClass = (variance: number, estimated: number): string => {
  if (estimated === 0) return 'text-muted-foreground';
  const percent = (variance / estimated) * 100;
  if (percent > 10) return 'text-emerald-600';
  if (percent > 0) return 'text-emerald-500';
  if (percent > -10) return 'text-amber-500';
  return 'text-destructive';
};
