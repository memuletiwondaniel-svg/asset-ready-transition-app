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
  region_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_favorite?: boolean;
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
      console.log('🔍 Fetching projects from projects_enriched view...');
      
      // Use the optimized view that joins all data server-side in a single query
      // Cast to 'any' since this is a custom view not in generated types
      const { data, error } = await (supabase
        .from('projects_enriched' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any);

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

      if (!data || data.length === 0) {
        console.warn('⚠️ No projects found in database');
        return [];
      }

      return data as Project[];
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