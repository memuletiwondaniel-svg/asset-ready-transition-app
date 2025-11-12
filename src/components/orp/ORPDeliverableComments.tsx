import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useORPComments } from '@/hooks/useORPComments';
import { MessageSquare, Send, Reply, Edit2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ORPDeliverableCommentsProps {
  deliverableId: string;
  deliverableName: string;
  planId: string;
}

export const ORPDeliverableComments: React.FC<ORPDeliverableCommentsProps> = ({
  deliverableId,
  deliverableName,
  planId
}) => {
  const { comments, isLoading, addComment, updateComment, deleteComment, isAddingComment } = useORPComments(deliverableId);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    // Extract mentions from comment (basic @ detection)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(newComment)) !== null) {
      mentions.push(match[2]); // Extract user ID
    }

    addComment({
      comment: newComment,
      mentions,
      parentCommentId: replyingTo || undefined,
      deliverableName,
      planId
    });

    setNewComment('');
    setReplyingTo(null);
  };

  const handleEdit = (commentId: string, currentText: string) => {
    setEditingComment(commentId);
    setEditText(currentText);
  };

  const handleSaveEdit = () => {
    if (!editingComment || !editText.trim()) return;

    updateComment({
      commentId: editingComment,
      comment: editText
    });

    setEditingComment(null);
    setEditText('');
  };

  const handleDeleteClick = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (commentToDelete) {
      deleteComment(commentToDelete);
    }
    setDeleteDialogOpen(false);
    setCommentToDelete(null);
  };

  const renderComment = (comment: any, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-12 mt-3' : 'mb-4'}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user?.avatar_url} />
          <AvatarFallback>
            {comment.user?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">{comment.user?.full_name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>

            {editingComment === comment.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingComment(null);
                      setEditText('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
            )}
          </div>

          {!isReply && editingComment !== comment.id && (
            <div className="flex gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setReplyingTo(comment.id)}
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleEdit(comment.id, comment.comment)}
              >
                <Edit2 className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => handleDeleteClick(comment.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply: any) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-5 h-5" />
            Discussion - {deliverableName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comment Input */}
          <div className="space-y-3">
            {replyingTo && (
              <Badge variant="secondary" className="gap-2">
                Replying to comment
                <button
                  onClick={() => setReplyingTo(null)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            <Textarea
              placeholder="Add a comment or ask a question..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isAddingComment}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {replyingTo ? 'Reply' : 'Comment'}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => renderComment(comment))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No comments yet</p>
                <p className="text-sm">Be the first to start the discussion</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
