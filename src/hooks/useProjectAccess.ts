import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export function useProjectAccess(projectId: string | undefined) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['project-access', projectId, user?.id],
    queryFn: async () => {
      if (!projectId || !user?.id) return { isTeamMember: false, isAdmin: false };

      // Check if user is a team member of this project
      const { data: member } = await (supabase as any)
        .from('project_team_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      // Check if user is admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      // Check if user is the project creator
      const { data: project } = await (supabase as any)
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .maybeSingle();

      const isCreator = project?.created_by === user.id;
      const isAdmin = !!adminRole;
      const isTeamMember = !!member;

      return { isTeamMember, isAdmin, isCreator };
    },
    enabled: !!projectId && !!user?.id,
    staleTime: 60_000,
  });

  const canEdit = data?.isTeamMember || data?.isAdmin || data?.isCreator || false;

  return {
    isTeamMember: data?.isTeamMember || false,
    isAdmin: data?.isAdmin || false,
    isReadOnly: !canEdit,
    isLoading,
  };
}
