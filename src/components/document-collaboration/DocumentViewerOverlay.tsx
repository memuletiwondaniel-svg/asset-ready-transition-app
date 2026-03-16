import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink, MessageCircle, PanelRightClose } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AnnotationToolbar, type ToolMode } from './AnnotationToolbar';
import { DocumentCanvas } from './DocumentCanvas';
import { AnnotationLayer } from './AnnotationLayer';
import { CommentsSidebar } from './CommentsSidebar';
import { CollaboratorPresence } from './CollaboratorPresence';
import { useAttachmentCollaboration, type Annotation } from '@/hooks/useAttachmentCollaboration';

interface AttachmentData {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_url: string;
}

interface DocumentViewerOverlayProps {
  attachment: AttachmentData | null;
  open: boolean;
  onClose: () => void;
}

export const DocumentViewerOverlay: React.FC<DocumentViewerOverlayProps> = ({
  attachment,
  open,
  onClose,
}) => {
  const [activeTool, setActiveTool] = useState<ToolMode>('pointer');
  const [activeColor, setActiveColor] = useState('#FFEB3B');
  const [zoom, setZoom] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(window.innerWidth >= 768);

  const {
    annotations,
    replies,
    onlineUsers,
    currentPage,
    setCurrentPage,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    addReply,
    deleteReply,
  } = useAttachmentCollaboration(attachment?.id || null);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.25, 0.5)), []);
  const handleReset = useCallback(() => setZoom(1), []);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (!attachment) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* High z-index backdrop to dim everything including task detail */}
      <DialogOverlay className="!z-[199] bg-black/80 backdrop-blur-sm" />
      <DialogContent className="!fixed !inset-0 !max-w-none !w-full !h-[100dvh] !translate-x-0 !translate-y-0 !left-0 !top-0 !rounded-none md:!inset-auto md:!left-1/2 md:!top-1/2 md:!-translate-x-1/2 md:!-translate-y-1/2 md:!max-w-[92vw] md:!w-[92vw] md:!h-[98vh] md:!rounded-xl p-0 gap-0 flex flex-col [&>button]:hidden !z-[200] border-border overscroll-contain">
        <TooltipProvider delayDuration={200}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate max-w-[400px]">
                {attachment.file_name}
              </h2>
              {/* Online collaborators in header */}
              {onlineUsers.length > 0 && (
                <div className="flex items-center gap-1.5 ml-2">
                  <div className="flex -space-x-1.5">
                    {onlineUsers.slice(0, 4).map((u) => (
                      <Tooltip key={u.user_id}>
                        <TooltipTrigger>
                          <Avatar className="h-6 w-6 border-2 border-card">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                              {getInitials(u.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{u.full_name} — Page {u.page_number}</TooltipContent>
                      </Tooltip>
                    ))}
                    {onlineUsers.length > 4 && (
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted border-2 border-card text-[8px] font-medium text-muted-foreground">
                        +{onlineUsers.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{onlineUsers.length} editing</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => window.open(attachment.file_url, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = attachment.file_url;
                  a.download = attachment.file_name;
                  a.click();
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setCommentsOpen(prev => !prev)}
              >
                {commentsOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                {commentsOpen ? 'Hide Comments' : 'Comments'}
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left toolbar */}
            <AnnotationToolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              activeColor={activeColor}
              onColorChange={setActiveColor}
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleReset}
            />

            {/* Document canvas */}
            <DocumentCanvas
              fileUrl={attachment.file_url}
              fileType={attachment.file_type}
              fileName={attachment.file_name}
              zoom={zoom}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onTotalPagesChange={setTotalPages}
              totalPages={totalPages}
            >
              <AnnotationLayer
                annotations={annotations}
                activeTool={activeTool}
                activeColor={activeColor}
                pageNumber={currentPage}
                onCreateAnnotation={createAnnotation}
                onUpdateAnnotation={updateAnnotation}
                onSelectAnnotation={(ann) => setSelectedAnnotation(ann)}
                selectedAnnotationId={selectedAnnotation?.id || null}
              />
            </DocumentCanvas>

            {/* Comments sidebar */}
            {commentsOpen && (
              <CommentsSidebar
                annotations={annotations}
                replies={replies}
                selectedAnnotationId={selectedAnnotation?.id || null}
                onSelectAnnotation={(ann) => setSelectedAnnotation(ann)}
                onResolve={(id, resolved) => updateAnnotation({ id, resolved })}
                onDelete={(id) => deleteAnnotation(id)}
                onAddReply={addReply}
                onDeleteReply={deleteReply}
              />
            )}
          </div>

          {/* Status bar */}
          <CollaboratorPresence
            onlineUsers={onlineUsers}
            currentPage={currentPage}
            totalPages={totalPages}
            fileName={attachment.file_name}
          />
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
};
