/* @ts-nocheck */
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Project {
  id: string;
  project_id_prefix: 'DP' | 'ST' | 'MoC';
  project_id_number: string;
  project_title: string;
  plant_id?: string;
  station_id?: string;
  project_scope?: string;
  project_scope_image_url?: string;
  hub_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  // Joined data
  plant_name?: string;
  station_name?: string;
  hub_name?: string;
  // Enhanced data
  team_count?: number;
  team_lead_name?: string;
  team_lead_avatar?: string;
  milestone_count?: number;
  completed_milestone_count?: number;
  next_milestone_name?: string;
  next_milestone_date?: string;
  is_scorecard?: boolean;
  document_count?: number;
}

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  is_lead: boolean;
  created_at: string;
  user_name?: string;
  avatar_url?: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  milestone_name: string;
  milestone_date: string;
  is_scorecard_project: boolean;
  created_at: string;
  created_by: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  document_name: string;
  document_type: 'file' | 'link';
  file_path?: string;
  link_url?: string;
  link_type?: 'assai' | 'sharepoint' | 'wrench';
  file_extension?: string;
  file_size?: number;
  uploaded_by: string;
  created_at: string;
}

export const useProjects = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('🎬 useProjects hook called');

  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      console.log('🔍 Fetching projects from Supabase...');
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching projects:', error);
        toast({
          title: 'Error loading projects',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      console.log('✅ Projects fetched successfully:', data?.length || 0, 'projects');
      console.log('Projects data:', data);

      if (!data || data.length === 0) {
        console.warn('⚠️ No projects found in database');
        return [];
      }

      // Batch fetch all related data in parallel (optimized from N+1 queries)
      const projectIds = data.map(p => p.id);
      const plantIds = data.filter(p => p.plant_id).map(p => p.plant_id);
      const stationIds = data.filter(p => p.station_id).map(p => p.station_id);
      const hubIds = data.filter(p => p.hub_id).map(p => p.hub_id);

      // Execute all queries in parallel
      const [
        plantsResult,
        stationsResult,
        hubsResult,
        teamMembersResult,
        milestonesResult,
        documentsResult
      ] = await Promise.all([
        // Fetch all plants in one query
        plantIds.length > 0 
          ? supabase.from('plant').select('id, name').in('id', plantIds)
          : { data: [] },
        // Fetch all stations in one query
        stationIds.length > 0
          ? supabase.from('station').select('id, name').in('id', stationIds)
          : { data: [] },
        // Fetch all hubs in one query
        hubIds.length > 0
          ? supabase.from('hubs').select('id, name').in('id', hubIds)
          : { data: [] },
        // Fetch all team members in one query
        supabase.from('project_team_members').select('id, project_id, is_lead, user_id').in('project_id', projectIds),
        // Fetch all milestones in one query
        supabase.from('project_milestones').select('id, project_id, milestone_name, milestone_date, is_scorecard_project').in('project_id', projectIds).order('milestone_date', { ascending: true }),
        // Fetch all documents count in one query
        supabase.from('project_documents').select('id, project_id').in('project_id', projectIds)
      ]);

      // Create lookup maps for O(1) access
      const plantMap = new Map((plantsResult.data || []).map(p => [p.id, p.name]));
      const stationMap = new Map((stationsResult.data || []).map(s => [s.id, s.name]));
      const hubMap = new Map((hubsResult.data || []).map(h => [h.id, h.name]));

      // Group team members by project
      const teamMembersByProject = new Map<string, typeof teamMembersResult.data>();
      (teamMembersResult.data || []).forEach(tm => {
        const existing = teamMembersByProject.get(tm.project_id) || [];
        existing.push(tm);
        teamMembersByProject.set(tm.project_id, existing);
      });

      // Group milestones by project
      const milestonesByProject = new Map<string, typeof milestonesResult.data>();
      (milestonesResult.data || []).forEach(m => {
        const existing = milestonesByProject.get(m.project_id) || [];
        existing.push(m);
        milestonesByProject.set(m.project_id, existing);
      });

      // Group documents by project
      const documentsByProject = new Map<string, number>();
      (documentsResult.data || []).forEach(d => {
        documentsByProject.set(d.project_id, (documentsByProject.get(d.project_id) || 0) + 1);
      });

      // Get all team lead user IDs for batch profile fetch
      const teamLeadUserIds: string[] = [];
      teamMembersByProject.forEach((members) => {
        const lead = members.find(m => m.is_lead);
        if (lead) teamLeadUserIds.push(lead.user_id);
      });

      // Batch fetch all team lead profiles in one query
      const profilesResult = teamLeadUserIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', teamLeadUserIds)
        : { data: [] };
      
      const profileMap = new Map((profilesResult.data || []).map(p => [p.id, p]));

      // Enrich projects using lookup maps (no additional queries)
      const now = new Date();
      const enrichedProjects = data.map((project) => {
        const teamMembers = teamMembersByProject.get(project.id) || [];
        const milestones = milestonesByProject.get(project.id) || [];
        const teamLead = teamMembers.find(m => m.is_lead);
        const leadProfile = teamLead ? profileMap.get(teamLead.user_id) : null;
        
        const completed_milestone_count = milestones.filter(m => new Date(m.milestone_date) < now).length;
        const nextMilestone = milestones.find(m => new Date(m.milestone_date) >= now);

        return {
          ...project,
          plant_name: project.plant_id ? plantMap.get(project.plant_id) : undefined,
          station_name: project.station_id ? stationMap.get(project.station_id) : undefined,
          hub_name: project.hub_id ? hubMap.get(project.hub_id) : undefined,
          team_count: teamMembers.length,
          team_lead_name: leadProfile?.full_name,
          team_lead_avatar: leadProfile?.avatar_url,
          milestone_count: milestones.length,
          completed_milestone_count,
          next_milestone_name: nextMilestone?.milestone_name,
          next_milestone_date: nextMilestone?.milestone_date,
          is_scorecard: milestones.some(m => m.is_scorecard_project),
          document_count: documentsByProject.get(project.id) || 0,
        };
      });

      console.log('✅ Enriched projects:', enrichedProjects);
      return enrichedProjects as Project[];
    },
    retry: 1,
    staleTime: 30000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    console.log('📊 useProjects state - loading:', isLoading, 'projects:', projects?.length || 0, 'error:', error);
  }, [isLoading, projects, error]);

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'is_active'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...projectData, created_by: user?.id || null }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error updating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project',
        variant: 'destructive',
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    },
  });

  return {
    projects,
    isLoading,
    error,
    createProject: createProjectMutation.mutate,
    updateProject: updateProjectMutation.mutate,
    deleteProject: deleteProjectMutation.mutate,
    isCreating: createProjectMutation.isPending,
    isUpdating: updateProjectMutation.isPending,
    isDeleting: deleteProjectMutation.isPending,
  };
};

export const useProjectTeamMembers = (projectId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: teamMembers = [],
    isLoading,
  } = useQuery({
    queryKey: ['project-team-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await (supabase as any)
        .from('project_team_members')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching team members:', error);
        throw error;
      }

      // Fetch profiles for each team member to get actual names and avatars
      const membersWithNames = await Promise.all(
        (data || []).map(async (member: any) => {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', member.user_id)
            .maybeSingle();
          
          return {
            ...member,
            user_name: profile?.full_name || 'Unknown User',
            avatar_url: profile?.avatar_url || '',
          };
        })
      );

      return membersWithNames as ProjectTeamMember[];
    },
    enabled: !!projectId,
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: async (memberData: { project_id: string; user_id: string; role: string; is_lead?: boolean }) => {
      const { data, error } = await (supabase as any)
        .from('project_team_members')
        .insert([memberData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-team-members', projectId] });
      toast({
        title: 'Success',
        description: 'Team member added successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error adding team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add team member',
        variant: 'destructive',
      });
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any)
        .from('project_team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-team-members', projectId] });
      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error removing team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive',
      });
    },
  });

  return {
    teamMembers,
    isLoading,
    addTeamMember: addTeamMemberMutation.mutate,
    removeTeamMember: removeTeamMemberMutation.mutate,
    isAdding: addTeamMemberMutation.isPending,
    isRemoving: removeTeamMemberMutation.isPending,
  };
};

export const useProjectMilestones = (projectId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: milestones = [],
    isLoading,
  } = useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('milestone_date', { ascending: true });

      if (error) {
        console.error('Error fetching milestones:', error);
        throw error;
      }

      return data as ProjectMilestone[];
    },
    enabled: !!projectId,
  });

  const addMilestoneMutation = useMutation({
    mutationFn: async (milestoneData: Omit<ProjectMilestone, 'id' | 'created_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('project_milestones')
        .insert([{ ...milestoneData, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] });
      toast({
        title: 'Success',
        description: 'Milestone added successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error adding milestone:', error);
      toast({
        title: 'Error',
        description: 'Failed to add milestone',
        variant: 'destructive',
      });
    },
  });

  const removeMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      const { error } = await supabase
        .from('project_milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] });
      toast({
        title: 'Success',
        description: 'Milestone removed successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error removing milestone:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove milestone',
        variant: 'destructive',
      });
    },
  });

  return {
    milestones,
    isLoading,
    addMilestone: addMilestoneMutation.mutate,
    removeMilestone: removeMilestoneMutation.mutate,
    isAdding: addMilestoneMutation.isPending,
    isRemoving: removeMilestoneMutation.isPending,
  };
};

export const useProjectDocuments = (projectId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: documents = [],
    isLoading,
  } = useQuery({
    queryKey: ['project-documents', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }

      return data as ProjectDocument[];
    },
    enabled: !!projectId,
  });

  const addDocumentMutation = useMutation({
    mutationFn: async (documentData: Omit<ProjectDocument, 'id' | 'created_at' | 'uploaded_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('project_documents')
        .insert([{ ...documentData, uploaded_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast({
        title: 'Success',
        description: 'Document added successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error adding document:', error);
      toast({
        title: 'Error',
        description: 'Failed to add document',
        variant: 'destructive',
      });
    },
  });

  const removeDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast({
        title: 'Success',
        description: 'Document removed successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error removing document:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove document',
        variant: 'destructive',
      });
    },
  });

  return {
    documents,
    isLoading,
    addDocument: addDocumentMutation.mutate,
    removeDocument: removeDocumentMutation.mutate,
    isAdding: addDocumentMutation.isPending,
    isRemoving: removeDocumentMutation.isPending,
  };
};