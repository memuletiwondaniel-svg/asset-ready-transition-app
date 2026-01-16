import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { PACPrerequisite } from './useHandoverPrerequisites';

export type PrerequisiteStatus = 'NOT_COMPLETED' | 'COMPLETED' | 'NOT_APPLICABLE' | 'DEVIATION';

export interface P2AHandoverPrerequisite {
  id: string;
  handover_id: string;
  pac_prerequisite_id: string;
  status: PrerequisiteStatus;
  evidence_links: string[] | null;
  comments: string | null;
  receiving_party_user_id: string | null;
  deviation_reason: string | null;
  mitigation: string | null;
  follow_up_action: string | null;
  target_date: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  pac_prerequisite?: PACPrerequisite;
}

export interface PrerequisiteAttachment {
  id: string;
  handover_prerequisite_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface DeviationData {
  deviation_reason: string;
  mitigation: string;
  follow_up_action?: string;
  target_date?: string;
}

// Hook to manage handover prerequisites
export function useP2AHandoverPrerequisites(handoverId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch prerequisites for a specific handover
  const { data: prerequisites, isLoading, error } = useQuery({
    queryKey: ['p2a-handover-prerequisites', handoverId],
    queryFn: async () => {
      if (!handoverId) return [];
      
      const { data, error } = await supabase
        .from('p2a_handover_prerequisites')
        .select('*')
        .eq('handover_id', handoverId);

      if (error) throw error;
      return data as P2AHandoverPrerequisite[];
    },
    enabled: !!handoverId
  });

  // Initialize prerequisites for a handover from PAC prerequisites
  const initializePrerequisites = useMutation({
    mutationFn: async ({ handoverId, pacPrerequisiteIds }: { handoverId: string; pacPrerequisiteIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const records = pacPrerequisiteIds.map(pacId => ({
        handover_id: handoverId,
        pac_prerequisite_id: pacId,
        status: 'NOT_COMPLETED' as PrerequisiteStatus,
      }));

      const { data, error } = await supabase
        .from('p2a_handover_prerequisites')
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-prerequisites', handoverId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update prerequisite status
  const updatePrerequisiteStatus = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      comments,
      deviationData 
    }: { 
      id: string; 
      status: PrerequisiteStatus; 
      comments?: string;
      deviationData?: DeviationData;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: any = { 
        status,
        comments,
        completed_by: status === 'COMPLETED' ? user?.id : null,
        completed_at: status === 'COMPLETED' ? new Date().toISOString() : null,
      };

      if (status === 'DEVIATION' && deviationData) {
        updates.deviation_reason = deviationData.deviation_reason;
        updates.mitigation = deviationData.mitigation;
        updates.follow_up_action = deviationData.follow_up_action || null;
        updates.target_date = deviationData.target_date || null;
      } else if (status !== 'DEVIATION') {
        // Clear deviation fields if status is not deviation
        updates.deviation_reason = null;
        updates.mitigation = null;
        updates.follow_up_action = null;
        updates.target_date = null;
      }

      const { data, error } = await supabase
        .from('p2a_handover_prerequisites')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-prerequisites', handoverId] });
      toast({ title: 'Success', description: 'Prerequisite updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Add evidence link
  const addEvidenceLink = useMutation({
    mutationFn: async ({ id, link }: { id: string; link: string }) => {
      // First get current links
      const { data: current, error: fetchError } = await supabase
        .from('p2a_handover_prerequisites')
        .select('evidence_links')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const currentLinks = current.evidence_links || [];
      const newLinks = [...currentLinks, link];

      const { data, error } = await supabase
        .from('p2a_handover_prerequisites')
        .update({ evidence_links: newLinks })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-prerequisites', handoverId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Remove evidence link
  const removeEvidenceLink = useMutation({
    mutationFn: async ({ id, link }: { id: string; link: string }) => {
      const { data: current, error: fetchError } = await supabase
        .from('p2a_handover_prerequisites')
        .select('evidence_links')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const currentLinks = current.evidence_links || [];
      const newLinks = currentLinks.filter((l: string) => l !== link);

      const { data, error } = await supabase
        .from('p2a_handover_prerequisites')
        .update({ evidence_links: newLinks })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-prerequisites', handoverId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update receiving party
  const updateReceivingParty = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string | null }) => {
      const { data, error } = await supabase
        .from('p2a_handover_prerequisites')
        .update({ receiving_party_user_id: userId })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-prerequisites', handoverId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Calculate completion progress
  const getCompletionProgress = () => {
    if (!prerequisites || prerequisites.length === 0) return { total: 0, completed: 0, percentage: 0 };
    
    const completed = prerequisites.filter(p => 
      p.status === 'COMPLETED' || p.status === 'NOT_APPLICABLE'
    ).length;
    
    return {
      total: prerequisites.length,
      completed,
      percentage: Math.round((completed / prerequisites.length) * 100)
    };
  };

  return {
    prerequisites,
    isLoading,
    error,
    initializePrerequisites: initializePrerequisites.mutateAsync,
    updatePrerequisiteStatus: updatePrerequisiteStatus.mutate,
    addEvidenceLink: addEvidenceLink.mutate,
    removeEvidenceLink: removeEvidenceLink.mutate,
    updateReceivingParty: updateReceivingParty.mutate,
    getCompletionProgress,
    isInitializing: initializePrerequisites.isPending,
    isUpdating: updatePrerequisiteStatus.isPending,
  };
}

// Hook to manage prerequisite attachments
export function usePrerequisiteAttachments(prerequisiteId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attachments, isLoading } = useQuery({
    queryKey: ['p2a-prerequisite-attachments', prerequisiteId],
    queryFn: async () => {
      if (!prerequisiteId) return [];
      
      const { data, error } = await supabase
        .from('p2a_prerequisite_attachments')
        .select('*')
        .eq('handover_prerequisite_id', prerequisiteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PrerequisiteAttachment[];
    },
    enabled: !!prerequisiteId
  });

  const uploadAttachment = useMutation({
    mutationFn: async ({ file, prerequisiteId }: { file: File; prerequisiteId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const filePath = `${prerequisiteId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('p2a-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('p2a_prerequisite_attachments')
        .insert({
          handover_prerequisite_id: prerequisiteId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-prerequisite-attachments', prerequisiteId] });
      toast({ title: 'Success', description: 'File uploaded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: PrerequisiteAttachment) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('p2a-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await supabase
        .from('p2a_prerequisite_attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-prerequisite-attachments', prerequisiteId] });
      toast({ title: 'Success', description: 'File deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    attachments,
    isLoading,
    uploadAttachment: uploadAttachment.mutate,
    deleteAttachment: deleteAttachment.mutate,
    isUploading: uploadAttachment.isPending,
    isDeleting: deleteAttachment.isPending,
  };
}
