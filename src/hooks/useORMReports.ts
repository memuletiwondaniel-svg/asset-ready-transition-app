import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useORMReports = (deliverableId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['orm-reports', deliverableId],
    queryFn: async () => {
      let query = supabase
        .from('orm_daily_reports')
        .select(`
          *,
          user:profiles!orm_daily_reports_submitted_by_fkey(full_name, avatar_url),
          deliverable:orm_deliverables(
            deliverable_type,
            orm_plan:orm_plans(
              project:projects(project_title)
            )
          )
        `)
        .order('report_date', { ascending: false });

      if (deliverableId) {
        query = query.eq('deliverable_id', deliverableId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: deliverableId !== undefined
  });

  const submitReport = useMutation({
    mutationFn: async (data: {
      deliverable_id: string;
      work_completed: string;
      hours_worked: number;
      challenges?: string;
      next_day_plan?: string;
      progress_percentage?: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('orm_daily_reports')
        .insert({
          deliverable_id: data.deliverable_id,
          submitted_by: user.user.id,
          work_completed: data.work_completed,
          hours_worked: data.hours_worked,
          challenges: data.challenges,
          next_day_plan: data.next_day_plan,
          progress_percentage: data.progress_percentage
        });

      if (error) throw error;

      // Update deliverable progress if provided
      if (data.progress_percentage !== undefined) {
        await supabase
          .from('orm_deliverables')
          .update({ progress_percentage: data.progress_percentage })
          .eq('id', data.deliverable_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-reports'] });
      queryClient.invalidateQueries({ queryKey: ['orm-plans'] });
      toast({
        title: 'Success',
        description: 'Daily report submitted successfully'
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

  return {
    reports,
    isLoading,
    submitReport: submitReport.mutate,
    isSubmitting: submitReport.isPending
  };
};
