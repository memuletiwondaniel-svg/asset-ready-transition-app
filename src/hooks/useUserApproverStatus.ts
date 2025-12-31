import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApproverStatus {
  isApprover: boolean;
  disciplineId: string | null;
  disciplineName: string | null;
  pendingCount: number;
}

export const useUserApproverStatus = () => {
  const { data: approverStatus, isLoading, error } = useQuery({
    queryKey: ['user-approver-status'],
    queryFn: async (): Promise<ApproverStatus> => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        return { isApprover: false, disciplineId: null, disciplineName: null, pendingCount: 0 };
      }

      // Get user's profile with discipline
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          discipline,
          discipline_info:discipline (
            id,
            name
          )
        `)
        .eq('user_id', session.session.user.id)
        .single();

      if (profileError || !profile?.discipline) {
        return { isApprover: false, disciplineId: null, disciplineName: null, pendingCount: 0 };
      }

      // Check if this discipline is assigned to any checklist items as an approving authority
      const { count: assignmentCount } = await supabase
        .from('checklist_item_approving_disciplines')
        .select('id', { count: 'exact', head: true })
        .eq('discipline_id', profile.discipline);

      if (!assignmentCount || assignmentCount === 0) {
        return { isApprover: false, disciplineId: null, disciplineName: null, pendingCount: 0 };
      }

      // Get count of pending approvals for this user's discipline
      const { count: pendingCount } = await supabase
        .from('checklist_item_approval_responses')
        .select('id', { count: 'exact', head: true })
        .eq('discipline_id', profile.discipline)
        .eq('status', 'pending');

      const disciplineInfo = profile.discipline_info as { id: string; name: string } | null;

      return {
        isApprover: true,
        disciplineId: profile.discipline,
        disciplineName: disciplineInfo?.name || null,
        pendingCount: pendingCount || 0,
      };
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    isApprover: approverStatus?.isApprover ?? false,
    disciplineId: approverStatus?.disciplineId ?? null,
    disciplineName: approverStatus?.disciplineName ?? null,
    pendingCount: approverStatus?.pendingCount ?? 0,
    isLoading,
    error,
  };
};
