import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useORMWorkflowComments } from '@/hooks/useORMWorkflowComments';
import { useORMAttachments } from '@/hooks/useORMAttachments';
import { MessageSquare, Paperclip, Send, X } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

interface ORMWorkflowCommentsPanelProps {
  deliverableId: string;
  workflowStage: 'IN_PROGRESS' | 'QAQC_REVIEW' | 'LEAD_REVIEW' | 'CENTRAL_TEAM_REVIEW' | 'APPROVED' | 'REJECTED';
}

export const ORMWorkflowCommentsPanel: React.FC<ORMWorkflowCommentsPanelProps> = ({
  deliverableId,
  workflowStage
}) => {
  const [comment, setComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { comments, addComment, isAdding } = useORMWorkflowComments(deliverableId);
  const { uploadAttachment, isUploading } = useORMAttachments(deliverableId);

  const handleSubmit = async () => {
    if (!comment.trim() && !selectedFile) return;

    if (comment.trim()) {
      addComment({
        deliverable_id: deliverableId,
        comment: comment.trim(),
        workflow_stage: workflowStage
      });
    }

    if (selectedFile) {
      uploadAttachment({
        deliverable_id: deliverableId,
        file: selectedFile,
        attachment_type: 'OTHER'
      });
    }

    setComment('');
    setSelectedFile(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Comments & Attachments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ScrollArea className="h-64">
            <div className="space-y-3 pr-4">
              {comments?.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={(c.user as any)?.avatar_url} />
                    <AvatarFallback>
                      {(c.user as any)?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{(c.user as any)?.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(c.created_at), 'MMM d, HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm">{c.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
              {comments?.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No comments yet
                </p>
              )}
            </div>
          </ScrollArea>

          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            
            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <Paperclip className="w-4 h-4" />
                <span className="text-sm flex-1">{selectedFile.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                type="file"
                id={`file-${deliverableId}`}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(`file-${deliverableId}`)?.click()}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Attach
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isAdding || isUploading || (!comment.trim() && !selectedFile)}
              >
                <Send className="w-4 h-4 mr-2" />
                {isAdding || isUploading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
