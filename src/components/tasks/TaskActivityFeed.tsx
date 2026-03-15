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
      <p className="text-sm font-medium mb-2 text-muted-foreground">
        Activity Feed
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
          {(() => {
            const hasReviewActivity = comments.some(
              (c) => c.comment?.startsWith('✅') || c.comment?.startsWith('❌') ||
                     c.comment_type === 'reviewer_decision' || c.comment_type === 'submission' ||
                     c.comment?.toLowerCase().includes('approved') || c.comment?.toLowerCase().includes('rejected')
            );

            // Collapse legacy split events: near-simultaneous "Completed" + free-text by same user → single "Submitted"
            const collapsed = comments.filter((entry, idx) => {
              const raw = entry.comment?.trim() || '';
              const normalized = raw.replace('Status changed to ', '');
              const isCompletedStatus = normalized === 'Completed' || entry.comment_type === 'status_change' && normalized === 'Completed';
              if (!isCompletedStatus) return true;
              // Check if there's a nearby free-text comment from same user within 10s
              const ts = new Date(entry.created_at).getTime();
              const hasSibling = comments.some((other, oi) =>
                oi !== idx &&
                other.user_id === entry.user_id &&
                !['Completed', 'In Progress', 'Not Started'].includes((other.comment?.trim() || '').replace('Status changed to ', '')) &&
                other.comment_type !== 'status_change' &&
                other.comment_type !== 'reviewer_decision' &&
                other.comment_type !== 'reviewer_void' &&
                Math.abs(new Date(other.created_at).getTime() - ts) <= 10_000
              );
              return !hasSibling; // suppress status badge when user comment exists nearby
            });

            return collapsed.map((entry) => {
            const rawComment = entry.comment?.trim() || '';
            const isVoid = entry.comment_type === 'reviewer_void' || rawComment.startsWith('⚠️') || rawComment.toLowerCase().includes('voided');
            const isApproval = !isVoid && (entry.comment?.startsWith('✅') || entry.comment?.toLowerCase().includes('approved'));
            const isRejection = !isVoid && (entry.comment?.startsWith('❌') || entry.comment?.toLowerCase().includes('rejected'));
            const isDecision = isApproval || isRejection;
            const normalizedComment = rawComment.replace('Status changed to ', '');
            const isStatusChange = entry.comment_type === 'status_change' || ['Completed', 'In Progress', 'Not Started'].includes(normalizedComment) || entry.comment?.startsWith('Status changed to ');
            const isSubmission = entry.comment_type === 'submission';
            const isReopened = entry.comment_type === 'reopened';

            // For tasks under review, show "Submitted" instead of "Completed"
            const isCompletedStatus = normalizedComment === 'Completed';
            const isNotStartedStatus = normalizedComment === 'Not Started';
            const displayLabel = isSubmission ? 'Submitted'
              : isReopened ? 'Not Completed'
              : isCompletedStatus && hasReviewActivity ? 'Submitted'
              : isNotStartedStatus ? 'Not Completed'
              : normalizedComment;
            const statusColor = isSubmission || (isCompletedStatus && hasReviewActivity)
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : isReopened || isNotStartedStatus
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : isCompletedStatus
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : normalizedComment === 'In Progress'
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

            return (
              <div key={entry.id} className="flex gap-2.5">
                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                  {entry.avatar_url && <AvatarImage src={entry.avatar_url} />}
                  <AvatarFallback className="text-[9px] font-medium bg-muted">
                    {(entry.full_name || '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {isVoid ? (
                    <>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 border-0 font-semibold bg-muted text-muted-foreground"
                      >
                        Decision Voided
                      </Badge>
                      {(() => {
                        const cleaned = rawComment
                          .replace(/^⚠️\s*/, '')
                          .replace(/^Decision\s+voided\s*[-–—]?\s*/i, '')
                          .replace(/^.*?\bvoided\b.*?[-–—]\s*/i, '')
                          .trim();
                        return cleaned ? (
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed mt-1">{cleaned}</p>
                        ) : null;
                      })()}
                    </>
                  ) : isSubmission ? (
                    <>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 border-0 font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        Submitted
                      </Badge>
                      {rawComment && (
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-1">{rawComment}</p>
                      )}
                    </>
                  ) : isReopened ? (
                    <>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 border-0 font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      >
                        Not Completed
                      </Badge>
                      {rawComment && (
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-1">{rawComment}</p>
                      )}
                    </>
                  ) : isDecision ? (
                    <>
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
                      {(() => {
                        const cleaned = rawComment
                          .replace(/^[✅❌]\s*/, '')
                          .replace(/^(Approved|Rejected)\s*(by\s+[^\n]*)?/i, '')
                          .trim();
                        return cleaned ? (
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-1">{cleaned}</p>
                        ) : null;
                      })()}
                    </>
                  ) : isStatusChange ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4 border-0 font-semibold",
                        statusColor
                      )}
                    >
                      {displayLabel}
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
          });
          })()}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">No activity yet</p>
      )}
    </div>
  );
};
