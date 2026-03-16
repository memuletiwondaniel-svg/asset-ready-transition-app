import React, { useRef, useState } from 'react';
import { Paperclip, Upload, FileText, FileSpreadsheet, Image as ImageIcon, File, Trash2, Download, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTaskAttachments, type TaskAttachment } from '@/hooks/useTaskAttachments';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { DocumentViewerOverlay } from '@/components/document-collaboration/DocumentViewerOverlay';

interface TaskAttachmentsSectionProps {
  taskId: string;
  sourceTaskId?: string;
  isReadOnly?: boolean;
  label?: string;
}

const FILE_ICON_MAP: Record<string, React.ElementType> = {
  'application/pdf': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'application/vnd.ms-excel': FileSpreadsheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return ImageIcon;
  return FILE_ICON_MAP[fileType] || File;
};

const getIconColor = (fileType: string | null) => {
  if (!fileType) return 'text-muted-foreground bg-muted';
  if (fileType.includes('pdf')) return 'text-red-600 bg-red-50 dark:bg-red-950/30';
  if (fileType.includes('word') || fileType.includes('document')) return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30';
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30';
  if (fileType.startsWith('image/')) return 'text-purple-600 bg-purple-50 dark:bg-purple-950/30';
  return 'text-muted-foreground bg-muted';
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const TaskAttachmentsSection: React.FC<TaskAttachmentsSectionProps> = ({
  taskId,
  sourceTaskId,
  isReadOnly = false,
  label = 'Attachments',
}) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<{
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
    file_url: string;
  } | null>(null);

  const {
    attachments,
    sourceAttachments,
    isLoading,
    isLoadingSource,
    uploadAttachment,
    deleteAttachment,
    isUploading,
    getDownloadUrl,
  } = useTaskAttachments(taskId, sourceTaskId);

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    // Upload to the primary task (owner uploads to own task, reviewer uploads to source task)
    const targetId = sourceTaskId || taskId;
    fileArray.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        return; // Skip files over 10MB
      }
      uploadAttachment(file, targetId);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const renderAttachmentCard = (attachment: TaskAttachment, canDelete: boolean) => {
    const Icon = getFileIcon(attachment.file_type);
    const iconColor = getIconColor(attachment.file_type);
    const downloadUrl = getDownloadUrl(attachment.file_path);

    return (
      <div
        key={attachment.id}
        className="group flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-card hover:bg-accent/30 transition-colors cursor-pointer"
        onClick={() => {
          const url = getDownloadUrl(attachment.file_path);
          setViewerAttachment({
            id: attachment.id,
            file_name: attachment.file_name,
            file_path: attachment.file_path,
            file_type: attachment.file_type,
            file_url: url,
          });
        }}
      >
        <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0', iconColor)}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate leading-tight">
            {attachment.file_name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{formatFileSize(attachment.file_size)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Open in viewer"
            onClick={(e) => {
              e.stopPropagation();
              const url = getDownloadUrl(attachment.file_path);
              setViewerAttachment({
                id: attachment.id,
                file_name: attachment.file_name,
                file_path: attachment.file_path,
                file_type: attachment.file_type,
                file_url: url,
              });
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); window.open(downloadUrl, '_blank'); }}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); deleteAttachment(attachment); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const allAttachments = sourceTaskId ? sourceAttachments : attachments;
  const loading = sourceTaskId ? isLoadingSource : isLoading;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        {allAttachments.length > 0 && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {allAttachments.length}
          </span>
        )}
      </div>

      {/* Source task attachments (submitted documents for reviewers) */}
      {sourceTaskId && sourceAttachments.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Submitted Documents</p>
          {sourceAttachments.map((a) => renderAttachmentCard(a, false))}
        </div>
      )}

      {/* Own attachments */}
      {attachments.length > 0 && sourceTaskId && (
        <div className="space-y-1.5 mt-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Your Attachments</p>
          {attachments.map((a) => renderAttachmentCard(a, a.uploaded_by === user?.id))}
        </div>
      )}

      {!sourceTaskId && attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((a) => renderAttachmentCard(a, !isReadOnly && a.uploaded_by === user?.id))}
        </div>
      )}

      {/* Upload zone */}
      {!isReadOnly && (
        <>
          <div
            className={cn(
              'relative rounded-lg border-2 border-dashed p-4 text-center transition-all cursor-pointer',
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border/60 hover:border-border hover:bg-accent/20'
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-2 py-1">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Uploading…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <Upload className="h-5 w-5 text-muted-foreground/60" />
                <p className="text-xs text-muted-foreground">
                  Drop files here or <span className="text-primary font-medium">browse</span>
                </p>
                <p className="text-[10px] text-muted-foreground/60">PDF, DOC, XLS, PPT, images — max 10 MB</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && allAttachments.length === 0 && isReadOnly && (
        <p className="text-xs text-muted-foreground text-center py-3">No attachments</p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Document Viewer Overlay */}
      <DocumentViewerOverlay
        attachment={viewerAttachment}
        open={!!viewerAttachment}
        onClose={() => setViewerAttachment(null)}
      />
    </div>
  );
};
