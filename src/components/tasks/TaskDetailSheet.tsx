import React, { useState } from 'react';
import { CheckCircle, X, Calendar, AlertTriangle, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { UserTask } from '@/hooks/useUserTasks';

interface TaskDetailSheetProps {
  task: UserTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (taskId: string, comment: string) => void;
  onReject: (taskId: string, comment: string) => void;
}

export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
  task,
  open,
  onOpenChange,
  onApprove,
  onReject,
}) => {
  const [comment, setComment] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleAction = (type: 'approve' | 'reject') => {
    if (!task) return;
    if (type === 'approve') {
      onApprove(task.id, comment);
    } else {
      onReject(task.id, comment);
    }
    setComment('');
    setAction(null);
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setComment('');
      setAction(null);
    }
    onOpenChange(isOpen);
  };

  if (!task) return null;

  const daysPending = Math.floor(
    (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'review':
        return <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600">Review</Badge>;
      case 'approval':
        return <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600">Approval</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{type}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">{priority} Priority</Badge>;
      case 'Medium':
        return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">{priority} Priority</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{priority} Priority</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {getTypeBadge(task.type)}
            {getPriorityBadge(task.priority)}
          </div>
          <SheetTitle className="text-left text-lg leading-snug mt-2">
            {task.title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Details Section */}
          <div className="space-y-3">
            {task.description && (
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Description</p>
                <p className="text-sm text-foreground">{task.description}</p>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Created {format(new Date(task.created_at), 'MMM d, yyyy')}</span>
              </div>
              {daysPending > 0 && (
                <div className={cn(
                  "flex items-center gap-1.5",
                  daysPending >= 7 ? "text-destructive" : daysPending >= 3 ? "text-amber-600" : "text-muted-foreground"
                )}>
                  {daysPending >= 7 && <AlertTriangle className="h-3.5 w-3.5" />}
                  <span>{daysPending} day{daysPending !== 1 ? 's' : ''} pending</span>
                </div>
              )}
            </div>

            {task.due_date && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Due {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Comment Section */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Comments <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="Add any comments or notes about your decision..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Decision</p>
            <div className="flex items-center gap-3">
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleAction('approve')}
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => handleAction('reject')}
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
