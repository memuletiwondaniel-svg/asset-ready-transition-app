import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { toast } from 'sonner';

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string | null;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
  uploader_avatar?: string;
}

export const useTaskAttachments = (taskId?: string, sourceTaskId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch attachments for the primary task
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await (supabase as any)
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Enrich with uploader names
      const uploaderIds = [...new Set((data || []).map((a: any) => a.uploaded_by))] as string[];
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', uploaderIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        return (data || []).map((a: any) => ({
          ...a,
          uploader_name: profileMap.get(a.uploaded_by)?.full_name || 'Unknown',
          uploader_avatar: profileMap.get(a.uploaded_by)?.avatar_url || null,
        }));
      }
      return data || [];
    },
    enabled: !!taskId,
  });

  // Fetch attachments from source task (for reviewers — read-only)
  const { data: sourceAttachments = [], isLoading: isLoadingSource } = useQuery({
    queryKey: ['task-attachments', sourceTaskId],
    queryFn: async () => {
      if (!sourceTaskId) return [];
      const { data, error } = await (supabase as any)
        .from('task_attachments')
        .select('*')
        .eq('task_id', sourceTaskId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const uploaderIds = [...new Set((data || []).map((a: any) => a.uploaded_by))] as string[];
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', uploaderIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        return (data || []).map((a: any) => ({
          ...a,
          uploader_name: profileMap.get(a.uploaded_by)?.full_name || 'Unknown',
          uploader_avatar: profileMap.get(a.uploaded_by)?.avatar_url || null,
        }));
      }
      return data || [];
    },
    enabled: !!sourceTaskId,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, targetTaskId }: { file: File; targetTaskId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const filePath = `${targetTaskId}/${Date.now()}-${file.name}`;
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);
      if (storageError) throw storageError;

      const { error: dbError } = await (supabase as any)
        .from('task_attachments')
        .insert({
          task_id: targetTaskId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type || null,
          uploaded_by: user.id,
        });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments'] });
      toast.success('File uploaded');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachment: TaskAttachment) => {
      await supabase.storage.from('task-attachments').remove([attachment.file_path]);
      const { error } = await (supabase as any)
        .from('task_attachments')
        .delete()
        .eq('id', attachment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments'] });
      toast.success('Attachment removed');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Delete failed');
    },
  });

  const getDownloadUrl = (filePath: string) => {
    return supabase.storage.from('task-attachments').getPublicUrl(filePath).data.publicUrl;
  };

  return {
    attachments: attachments as TaskAttachment[],
    sourceAttachments: sourceAttachments as TaskAttachment[],
    isLoading,
    isLoadingSource,
    uploadAttachment: (file: File, targetTaskId: string) =>
      uploadMutation.mutate({ file, targetTaskId }),
    deleteAttachment: (attachment: TaskAttachment) => deleteMutation.mutate(attachment),
    isUploading: uploadMutation.isPending,
    getDownloadUrl,
  };
};
