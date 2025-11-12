import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, File, Trash2, Download, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface P2AFileUploadProps {
  deliverableId: string;
  handoverId: string;
}

interface FileAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
  uploaded_by: string;
}

export const P2AFileUpload: React.FC<P2AFileUploadProps> = ({ deliverableId, handoverId }) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch attachments
  const { data: attachments, isLoading } = useQuery({
    queryKey: ['p2a-attachments', deliverableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_deliverable_attachments')
        .select('*')
        .eq('deliverable_id', deliverableId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FileAttachment[];
    }
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max)
    if (file.size > 52428800) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 50MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${handoverId}/${deliverableId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('p2a-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save file metadata to database
      const { error: dbError } = await supabase
        .from('p2a_deliverable_attachments')
        .insert({
          deliverable_id: deliverableId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });

      queryClient.invalidateQueries({ queryKey: ['p2a-attachments', deliverableId] });
      event.target.value = '';
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: FileAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('p2a-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (attachment: FileAttachment) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('p2a-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('p2a_deliverable_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-attachments', deliverableId] });
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>File Attachments</span>
          <div className="relative">
            <Input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            />
            <Button disabled={uploading} size="sm">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading attachments...</div>
        ) : attachments && attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{attachment.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(attachment)}
                    className="h-8 w-8"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(attachment)}
                    disabled={deleteMutation.isPending}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No files attached yet</p>
            <p className="text-xs mt-2">Upload PAC certificates, technical documents, or handover packages</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};