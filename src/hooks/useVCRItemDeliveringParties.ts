import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DeliveringPartyMember {
  id: string; // junction row id
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role_name: string | null;
  created_at: string;
}

export const useVCRItemDeliveringParties = (vcrItemId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['vcr-item-delivering-parties', vcrItemId],
    queryFn: async (): Promise<DeliveringPartyMember[]> => {
      if (!vcrItemId) return [];

      // Use any to avoid deep type inference
      const client = supabase as any;

      const { data: parties, error } = await client
        .from('vcr_item_delivering_parties')
        .select('id, user_id, created_at')
        .eq('vcr_item_id', vcrItemId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!parties || parties.length === 0) return [];

      const userIds = parties.map((p: any) => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .in('user_id', userIds);

      // Get role names
      const roleIds = [...new Set((profiles || []).map((p: any) => p.role).filter(Boolean))];
      let roleMap: Record<string, string> = {};
      if (roleIds.length > 0) {
        const { data: roles } = await supabase.from('roles').select('id, name').in('id', roleIds);
        roles?.forEach((r: any) => { roleMap[r.id] = r.name; });
      }

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return parties.map((p: any) => {
        const profile = profileMap.get(p.user_id);
        return {
          id: p.id,
          user_id: p.user_id,
          full_name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
          role_name: profile?.role ? roleMap[profile.role] || null : null,
          created_at: p.created_at,
        };
      });
    },
    enabled: !!vcrItemId,
  });

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      const client = supabase as any;
      const { data: user } = await supabase.auth.getUser();
      const { error } = await client
        .from('vcr_item_delivering_parties')
        .insert({ vcr_item_id: vcrItemId, user_id: userId, added_by: user?.user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-item-delivering-parties', vcrItemId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-item-detail'] });
      toast({ title: 'Delivering party added' });
    },
    onError: (err: any) => {
      if (err?.code === '23505') {
        toast({ title: 'Already assigned', description: 'This person is already a delivering party', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to add delivering party', variant: 'destructive' });
      }
    },
  });

  const removeMember = useMutation({
    mutationFn: async (junctionId: string) => {
      const client = supabase as any;
      const { error } = await client
        .from('vcr_item_delivering_parties')
        .delete()
        .eq('id', junctionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-item-delivering-parties', vcrItemId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-item-detail'] });
      toast({ title: 'Delivering party removed' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove delivering party', variant: 'destructive' });
    },
  });

  return {
    members: query.data || [],
    isLoading: query.isLoading,
    addMember,
    removeMember,
  };
};

// Hook to search available team members for a project
export const useProjectTeamSearch = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-team-search', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // Get project team members
      const { data: members } = await supabase
        .from('project_team_members')
        .select('user_id')
        .eq('project_id', projectId);

      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .in('user_id', userIds)
        .eq('is_active', true)
        .order('full_name');

      // Get role names
      const roleIds = [...new Set((profiles || []).map(p => p.role).filter(Boolean))];
      let roleMap: Record<string, string> = {};
      if (roleIds.length > 0) {
        const { data: roles } = await supabase.from('roles').select('id, name').in('id', roleIds as string[]);
        roles?.forEach((r: any) => { roleMap[r.id] = r.name; });
      }

      return (profiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name || 'Unknown',
        avatar_url: p.avatar_url,
        role_name: p.role ? roleMap[p.role] || null : null,
      }));
    },
    enabled: !!projectId,
  });
};
