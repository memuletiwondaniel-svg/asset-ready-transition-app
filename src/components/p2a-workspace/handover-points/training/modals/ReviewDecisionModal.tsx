import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useTrainingActions } from '../useTrainingActions';
import { ModalTitleBlock, ModalSection } from './ModalPrimitives';
import { PaperclipAttach, AttachedFile } from './PaperclipAttach';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  trainingId: string;
  trainingTitle: string;
  provider?: string | null;
  decidedCount: number;
  totalReviewers: number;
  reviewerRowId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Reviewer decision modal for a training in MATERIALS_UNDER_REVIEW.
 * Comments mandatory for BOTH decisions. Approve/Reject buttons are muted
 * until Comments has content, then colour on hover. Reject opens a slim
 * confirm; Approve submits directly. Optional markup attachment (paperclip).
 */
export const ReviewDecisionModal: React.FC<Props> = ({
  trainingId, trainingTitle, provider, decidedCount, totalReviewers,
  reviewerRowId, open, onOpenChange,
}) => {
  const [comment, setComment] = useState('');
  const [markup, setMarkup] = useState<AttachedFile[]>([]);
  const [confirmReject, setConfirmReject] = useState(false);
  const mutation = useTrainingActions(trainingId);

  useEffect(() => {
    if (open) {
      setComment('');
      setMarkup([]);
      setConfirmReject(false);
    }
  }, [open]);

  const filled = comment.trim().length > 0;

  const submit = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!filled) return;

    // Upload markup first (if any) so we can attach its id to the reviewer row
    let markupAttachmentId: string | null = null;
    if (markup.length > 0) {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      const f = markup[0].file;
      const safeName = f.name.replace(/[^\w.\-]+/g, '_');
      const path = `${trainingId}/markup/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('training-materials')
        .upload(path, f, { cacheControl: '3600', upsert: false });
      if (upErr) return;
      const client = supabase as any;
      const { data: ins, error: insErr } = await client
        .from('p2a_vcr_training_attachments')
        .insert({
          training_id: trainingId,
          kind: 'markup',
          file_name: f.name,
          file_path: path,
          file_size: f.size,
          file_type: f.type,
          uploaded_by: uid,
          linked_reviewer_id: reviewerRowId,
        })
        .select('id')
        .single();
      if (insErr) return;
      markupAttachmentId = ins?.id ?? null;
    }

    await mutation.mutateAsync({
      action: 'submit_review',
      payload: {
        decision,
        comment: comment.trim(),
        markup_attachment_id: markupAttachmentId,
      },
    });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent overlayClassName="z-[1500]" className="max-w-md z-[1510]">
          <DialogHeader>
            <ModalTitleBlock title="Review materials" trainingTitle={trainingTitle} provider={provider} />
          </DialogHeader>

          <div className="text-[11.5px] text-muted-foreground" style={{ marginTop: '18px' }}>
            {decidedCount} of {totalReviewers} reviewers decided
          </div>

          <ModalSection label="Comments *">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Required — explain your decision"
              className="min-h-[110px] text-[12.5px]"
            />
          </ModalSection>

          <ModalSection label="Markup">
            <PaperclipAttach
              label="Attach markup"
              files={markup}
              onChange={setMarkup}
              multiple={false}
              hint="Optional"
            />
          </ModalSection>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmReject(true)}
              disabled={!filled || mutation.isPending}
              className={cn(
                'transition-colors',
                !filled
                  ? 'opacity-40'
                  : 'border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10',
              )}
            >
              Reject
            </Button>
            <Button
              onClick={() => submit('APPROVED')}
              disabled={!filled || mutation.isPending}
              className={cn(
                'transition-colors',
                !filled
                  ? 'bg-muted text-muted-foreground opacity-60 hover:bg-muted'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white',
              )}
            >
              {mutation.isPending ? 'Submitting…' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent overlayClassName="z-[1500]" className="max-w-sm z-[1520]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[14px]">Reject training materials?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px]">
              This cancels the other reviewers' tasks and sends the deliverable
              back to the author for rework.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Keep reviewing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => submit('REJECTED')}
              disabled={mutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {mutation.isPending ? 'Submitting…' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
