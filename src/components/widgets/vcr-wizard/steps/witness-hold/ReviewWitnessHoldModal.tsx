import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { WHPoint } from '@/components/p2a-workspace/handover-points/vcr-standard/deliverables/useWHPoints';

/**
 * FE-2: Review & Approve modal (UNDER_REVIEW — my PENDING accepting row).
 * Approve = single click. Reject requires inline comment + slim confirm dialog.
 */

export interface ReviewWitnessHoldModalProps {
  point: WHPoint;
  currentUserId: string | null;
  deliveringPartyLabel: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDecided?: () => void;
}

const initials = (n: string) =>
  n.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

export const ReviewWitnessHoldModal: React.FC<ReviewWitnessHoldModalProps> = ({
  point, currentUserId, deliveringPartyLabel, open, onOpenChange, onDecided,
}) => {
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);

  useEffect(() => { if (open) { setComment(''); setConfirmReject(false); } }, [open]);

  const myRow = point.accepting_parties.find(
    (p) => p.user_id === currentUserId && p.status === 'PENDING',
  );

  const submitter = point.activity_log
    .slice()
    .reverse()
    .find((l) => l.action === 'submitted');

  const evidence = point.attachments.filter((a) => a.kind === 'evidence');

  const decide = useMutation({
    mutationFn: async (verdict: 'APPROVED' | 'REJECTED') => {
      if (!myRow) throw new Error('No pending row for current user');
      if (verdict === 'REJECTED' && !comment.trim()) {
        throw new Error('Comment required for rejection');
      }
      const c = supabase as any;
      const upd = await c
        .from('p2a_itp_accepting_parties')
        .update({
          status: verdict,
          comment: comment.trim() || null,
          decided_at: new Date().toISOString(),
        })
        .eq('id', myRow.id);
      if (upd.error) throw upd.error;
    },
    onSuccess: (_data, verdict) => {
      toast.success(verdict === 'APPROVED' ? 'Approved' : 'Returned for rework');
      qc.invalidateQueries({ queryKey: ['wh-points', point.handover_point_id] });
      onDecided?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to record decision'),
  });

  const canReject = comment.trim().length > 0 && !decide.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px] p-0 gap-0 !z-[1600]" overlayClassName="bg-black/80 backdrop-blur-sm !z-[1600]">
          <DialogHeader className="px-6 pt-5 pb-3">
            <DialogTitle className="text-base font-medium">Review &amp; approve</DialogTitle>
            <DialogDescription className="text-xs">{point.activity_name}</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Read-only submission block */}
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2.5">
              {submitter && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    {submitter.user_avatar_url && <AvatarImage src={submitter.user_avatar_url} />}
                    <AvatarFallback className="text-[10px]">
                      {initials(submitter.user_full_name || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium truncate">
                      {submitter.user_full_name || 'Delivering party'}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">
                      submitted {format(new Date(submitter.created_at), 'dd-MMM-yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80 mb-1">
                  Outcome
                </div>
                <div className="text-[12.5px] whitespace-pre-wrap leading-relaxed">
                  {point.outcome_summary || <span className="text-muted-foreground/60">—</span>}
                </div>
              </div>
              {evidence.length > 0 && (
                <div>
                  <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80 mb-1">
                    Evidence
                  </div>
                  <div className="space-y-1">
                    {evidence.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 text-[12px]">
                        <Paperclip className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate">{a.file_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inline comment */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Comment <span className="text-muted-foreground/60">(required to reject)</span>
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add notes for the delivering party…"
                className="text-sm min-h-[80px]"
              />
            </div>
          </div>

          <div className="px-6 py-3 border-t flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canReject}
              onClick={() => setConfirmReject(true)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Reject
            </Button>
            <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate('APPROVED')}>
              {decide.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent className="max-w-sm" overlayClassName="bg-black/80 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Return for rework?</AlertDialogTitle>
            <AlertDialogDescription>
              Return to <span className="font-medium text-foreground">{deliveringPartyLabel}</span> for rework?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => decide.mutate('REJECTED')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
