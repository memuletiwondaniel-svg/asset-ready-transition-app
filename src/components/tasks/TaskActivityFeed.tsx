import React, { useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useTaskComments } from '@/hooks/useTaskComments';

interface TaskActivityFeedProps {
  taskId: string;
}

export const TaskActivityFeed: React.FC<TaskActivityFeedProps> = ({ taskId }) => {
  const { comments, isLoading, addComment, isAddingComment } = useTaskComments(taskId);
  const [newComment, setNewComment] = useState('');

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment(newComment.trim());
    setNewComment('');
  };

  return (
    <div>
      <p className="text-sm font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
        <MessageSquare className="h-4 w-4" />
        Recent Activities
        {comments.length > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">{comments.length}</Badge>
        )}
      </p>

      {/* Add comment */}
      <div className="flex gap-2 mb-3">
        <Textarea
          placeholder="Add a comment or note..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[60px] resize-none text-sm"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={handleAddComment}
          disabled={!newComment.trim() || isAddingComment}
        >
          {isAddingComment ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.map((entry) => {
            const isApproval = entry.comment?.startsWith('✅') || entry.comment?.toLowerCase().includes('approved');
            const isRejection = entry.comment?.startsWith('❌') || entry.comment?.toLowerCase().includes('rejected');
            const isDecision = isApproval || isRejection;
            const isStatusChange = ['Completed', 'In Progress', 'Not Started'].includes(entry.comment?.trim()) || entry.comment?.startsWith('Status changed to ');

            return (
              <div key={entry.id} className="flex gap-2.5">
                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                  {entry.avatar_url && <AvatarImage src={entry.avatar_url} />}
                  <AvatarFallback className="text-[9px] font-medium bg-muted">
                    {(entry.full_name || '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {isDecision ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4 border-0 font-semibold",
                        isApproval
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      {isApproval ? 'Approved' : 'Rejected'}
                    </Badge>
                  ) : isStatusChange ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4 border-0 font-semibold",
                        entry.comment?.includes('Completed')
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : entry.comment?.includes('In Progress')
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      )}
                    >
                      {entry.comment?.replace('Status changed to ', '')}
                    </Badge>
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{entry.comment}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {entry.full_name} · {formatDistanceToNow(parseISO(entry.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">No activity yet</p>
      )}
    </div>
  );
};
