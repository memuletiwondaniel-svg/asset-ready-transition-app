import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChecklistApprover {
  id: string;
  checklist_id: string;
  user_id: string;
  approval_order: number;
  status: string;
  approved_at?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export const useChecklistApprovers = (checklistId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: approvers = [], isLoading } = useQuery({
    queryKey: ['checklist-approvers', checklistId],
    queryFn: async () => {
      if (!checklistId) return [];
      
      const { data, error } = await supabase
        .from('checklist_approvers' as any)
        .select('*')
        .eq('checklist_id', checklistId)
        .order('approval_order');

      if (error) throw error;
      return (data as any[]) as ChecklistApprover[];
    },
    enabled: !!checklistId,
  });

  const addApprovers = useMutation({
    mutationFn: async (approversData: { checklist_id: string; user_id: string; approval_order: number }[]) => {
      const { data, error } = await supabase
        .from('checklist_approvers' as any)
        .insert(approversData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-approvers'] });
      toast({
        title: "Success",
        description: "Approvers added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    approvers,
    isLoading,
    addApprovers,
  };
};
