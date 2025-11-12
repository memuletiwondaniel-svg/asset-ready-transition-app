import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useORMAttachments = (deliverableId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attachments, isLoading } = useQuery({
    queryKey: ['orm-attachments', deliverableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orm_attachments')
        .select(`
          *,
          uploader:profiles!orm_attachments_uploaded_by_fkey(full_name, avatar_url)
        `)
        .eq('deliverable_id', deliverableId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!deliverableId
  });

  const uploadAttachment = useMutation({
    mutationFn: async (data: {
      deliverable_id: string;
      file: File;
      attachment_type: 'SUPPORTING_DOCUMENT' | 'EVIDENCE' | 'QAQC_REVIEW' | 'OTHER';
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Upload file to storage
      const filePath = `${data.deliverable_id}/${Date.now()}_${data.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, data.file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { error: dbError } = await supabase
        .from('orm_attachments')
        .insert({
          deliverable_id: data.deliverable_id,
          file_name: data.file.name,
          file_path: filePath,
          file_type: data.file.type,
          file_size: data.file.size,
          attachment_type: data.attachment_type,
          uploaded_by: user.user.id
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-attachments'] });
      toast({
        title: 'Success',
        description: 'File uploaded successfully'
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

  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from('orm_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-attachments'] });
      toast({
        title: 'Success',
        description: 'Attachment deleted successfully'
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
    attachments,
    isLoading,
    uploadAttachment: uploadAttachment.mutate,
    deleteAttachment: deleteAttachment.mutate,
    isUploading: uploadAttachment.isPending
  };
};
