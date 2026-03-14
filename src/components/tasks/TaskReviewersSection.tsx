import React, { useState, useMemo } from 'react';
import { UserCheck, X, Check, XCircle, Loader2, Plus, Search } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useTaskReviewers, type TaskReviewer } from '@/hooks/useTaskReviewers';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { toast } from 'sonner';

interface TaskReviewersSectionProps {
  taskId: string | undefined;
  isReadOnly?: boolean;
  isTaskOwner: boolean;
  /** Called when a reviewer decision is made to add to the activity feed */
  onDecisionMade?: (decision: 'APPROVED' | 'REJECTED', reviewerName: string) => void;
}

export const TaskReviewersSection: React.FC<TaskReviewersSectionProps> = ({
  taskId,
  isReadOnly = false,
  isTaskOwner,
  onDecisionMade,
}) => {
  const { user } = useAuth();
  const {
    reviewers, isLoading, addReviewer, isAdding,
    removeReviewer, submitDecision, isSubmitting,
  } = useTaskReviewers(taskId);
  const { data: allUsers = [] } = useProfileUsers();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    reviewer: TaskReviewer | null;
    decision: 'APPROVED' | 'REJECTED';
  }>({ open: false, reviewer: null, decision: 'APPROVED' });
  const [decisionComment, setDecisionComment] = useState('');

  // Filter out users already added as reviewers and the current user (task owner shouldn't review own work)
  const existingUserIds = new Set(reviewers.map(r => r.user_id));
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      if (existingUserIds.has(u.user_id)) return false;
      if (u.user_id === user?.id) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return u.full_name.toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q);
    }).slice(0, 8);
  }, [allUsers, existingUserIds, searchQuery, user?.id]);

  const handleAddReviewer = async (selectedUser: typeof allUsers[0]) => {
    if (!taskId) return;
    try {
      const label = roleLabel.trim() || selectedUser.position || 'Reviewer';
      await addReviewer({ userId: selectedUser.user_id, roleLabel: label });
      toast.success(`${selectedUser.full_name} added as reviewer`);
      setSearchQuery('');
      setRoleLabel('');
      setSearchOpen(false);
    } catch {
      toast.error('Failed to add reviewer');
    }
  };

  const handleRemove = async (reviewer: TaskReviewer) => {
    try {
      await removeReviewer(reviewer.id);
      toast.success('Reviewer removed');
    } catch {
      toast.error('Failed to remove reviewer');
    }
  };

  const openConfirmDialog = (reviewer: TaskReviewer, decision: 'APPROVED' | 'REJECTED') => {
    setDecisionComment('');
    setConfirmDialog({ open: true, reviewer, decision });
  };

  const handleConfirmedDecision = async () => {
    const { reviewer, decision } = confirmDialog;
    if (!reviewer) return;
    try {
      await submitDecision({ reviewerId: reviewer.id, decision, comments: decisionComment.trim() || undefined });
      toast.success(decision === 'APPROVED' ? 'Approved' : 'Rejected');
      onDecisionMade?.(decision, reviewer.full_name || 'Unknown');
      setConfirmDialog({ open: false, reviewer: null, decision: 'APPROVED' });
      setDecisionComment('');
    } catch {
      toast.error('Failed to submit decision');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading reviewers...</span>
      </div>
    );
  }

  return (
    <div>
      <Separator className="mb-5" />
      <div>
        <p className="text-sm font-medium mb-3 flex items-center gap-1.5 text-muted-foreground">
          <UserCheck className="h-4 w-4" />
          Reviewers & Approvers
          {reviewers.length > 0 && (
            <span className="text-[10px] ml-1 text-muted-foreground/70">
              ({reviewers.filter(r => r.status === 'APPROVED').length}/{reviewers.length})
            </span>
          )}
        </p>

        {/* Reviewer list */}
        {reviewers.length > 0 && (
          <div className="space-y-2 mb-3">
            {reviewers.map((reviewer) => {
              const isMe = reviewer.user_id === user?.id;
              const canDecide = isMe && reviewer.status === 'PENDING' && !isReadOnly;
              const initials = (reviewer.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div
                  key={reviewer.id}
                  className={cn(
                    "flex items-center gap-2.5 p-2 rounded-lg border border-border/50 bg-muted/20",
                    canDecide && "ring-1 ring-primary/20 bg-primary/5"
                  )}
                >
                  <Avatar className="h-7 w-7">
                    {reviewer.avatar_url && <AvatarImage src={reviewer.avatar_url} />}
                    <AvatarFallback className="text-[10px] font-medium">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {reviewer.full_name}
                      {isMe && <span className="text-muted-foreground ml-1">(you)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{reviewer.role_label}</p>
                  </div>

                  {canDecide ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => openConfirmDialog(reviewer, 'REJECTED')}
                        disabled={isSubmitting}
                      >
                        <XCircle className="h-3 w-3 mr-0.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        onClick={() => openConfirmDialog(reviewer, 'APPROVED')}
                        disabled={isSubmitting}
                      >
                        <Check className="h-3 w-3 mr-0.5" />
                        Approve
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(reviewer.status)}
                      {isTaskOwner && !isReadOnly && (
                        <button
                          onClick={() => handleRemove(reviewer)}
                          className="text-muted-foreground/50 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add reviewer control - only for task owner */}
        {isTaskOwner && !isReadOnly && (
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 w-full justify-start text-muted-foreground border-dashed"
              >
                <Plus className="h-3 w-3" />
                Add reviewer or approver...
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2 z-[100]" align="start" side="top" sideOffset={4}>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 p-0"
                    autoFocus
                  />
                </div>
                <Input
                  placeholder="Role label (e.g. ORA Lead)"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  className="h-7 text-xs"
                />
                <Separator />
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {filteredUsers.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-2">No users found</p>
                  )}
                  {filteredUsers.map((u) => {
                    const initials = u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <button
                        key={u.user_id}
                        onClick={() => handleAddReviewer(u)}
                        disabled={isAdding}
                        className="w-full flex items-center gap-2 p-1.5 rounded-md text-left hover:bg-muted/60 transition-colors disabled:opacity-50"
                      >
                        <Avatar className="h-6 w-6">
                          {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                          <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{u.full_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.position || u.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {reviewers.length === 0 && !isTaskOwner && (
          <p className="text-[10px] text-muted-foreground italic">No reviewers assigned</p>
        )}
      </div>

      {/* Confirmation dialog for approve/reject */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => {
        if (!open) setConfirmDialog({ open: false, reviewer: null, decision: 'APPROVED' });
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.decision === 'APPROVED' ? 'Approve Task' : 'Reject Task'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.decision === 'APPROVED'
                ? 'Are you sure you want to approve this task? This action cannot be undone.'
                : 'Are you sure you want to reject this task? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Add comments (optional)..."
            value={decisionComment}
            onChange={(e) => setDecisionComment(e.target.value)}
            rows={3}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedDecision}
              disabled={isSubmitting}
              className={cn(
                confirmDialog.decision === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              )}
            >
              {isSubmitting ? 'Submitting...' : confirmDialog.decision === 'APPROVED' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
