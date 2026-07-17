import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTrainingActions } from '../useTrainingActions';
import { ModalTitleBlock, ModalSection } from './ModalPrimitives';
import { PaperclipAttach, AttachedFile } from './PaperclipAttach';
import { ReviewerPickerList, ReviewerPick } from './ReviewerPickerList';
import type { TrainingReviewerRow, TrainingActivityRow } from '../useTrainingLifecycle';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface Props {
  trainingId: string;
  trainingTitle: string;
  provider?: string | null;
  existingReviewers: TrainingReviewerRow[];
  activity?: TrainingActivityRow[];
  isResubmit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialsOf = (name: string | null | undefined) =>
  (name || '?').split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const resolveAvatar = (u: string | null | undefined) => {
  if (!u) return null;
  if (u.startsWith('http')) return u;
  return supabase.storage.from('user-avatars').getPublicUrl(u).data.publicUrl;
};

export const UploadMaterialsModal: React.FC<Props> = ({
  trainingId, trainingTitle, provider, existingReviewers, activity = [], isResubmit, open, onOpenChange,
}) => {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [reviewers, setReviewers] = useState<ReviewerPick[]>([]);
  const mutation = useTrainingActions(trainingId);

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setReviewers(
      existingReviewers.map((r) => ({
        user_id: r.user_id,
        full_name: r.full_name,
        avatar_url: r.avatar_url,
        role_label: r.role_label,
      })),
    );
  }, [open, existingReviewers]);

  const valid = reviewers.length > 0 && (isResubmit || files.length > 0);

  const submit = async () => {
    if (!valid) return;
    await mutation.mutateAsync({
      action: 'upload_materials',
      payload: {
        reviewers: reviewers.map((r) => ({ user_id: r.user_id, role_label: r.role_label ?? null })),
      },
      files: files.map((f) => ({ file: f.file, kind: 'material' })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg z-[1510]">
        <DialogHeader>
          <ModalTitleBlock
            title={isResubmit ? 'Re-upload materials' : 'Upload materials'}
            trainingTitle={trainingTitle}
            provider={provider}
          />
        </DialogHeader>

        {isResubmit && (() => {
          // Find the most recent rejection cycle: rejection comments logged
          // after the last from='MATERIALS_UNDER_REVIEW' → to='AWAITING_MATERIALS' transition.
          const kickbacks = activity.filter(
            (a) => a.action === 'Rejected training materials' && a.comment,
          );
          if (kickbacks.length === 0) return null;
          const latest = kickbacks.slice(-Math.min(kickbacks.length, 4));
          return (
            <div
              className="rounded-md border border-rose-200 bg-rose-50/60 dark:bg-rose-500/5 dark:border-rose-500/30 px-3 py-2.5"
              style={{ marginTop: '18px' }}
            >
              <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-rose-700 dark:text-rose-400">
                Rejection context
              </div>
              <div className="mt-2 space-y-2">
                {latest.map((a) => {
                  const av = resolveAvatar(a.actor_avatar_url);
                  return (
                    <div key={a.id} className="flex gap-2">
                      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                        {av && <AvatarImage src={av} alt={a.actor_name || ''} />}
                        <AvatarFallback className="text-[9px] bg-muted">{initialsOf(a.actor_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{a.actor_name || 'Reviewer'}</span>
                          {' · '}
                          {format(new Date(a.created_at), 'd MMM yyyy, HH:mm')}
                        </div>
                        <div className="text-[12px] text-foreground/90 whitespace-pre-wrap leading-snug mt-0.5">
                          {a.comment}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <ModalSection label="Reviewers">
          <p className="text-[11.5px] text-muted-foreground -mt-0.5">
            Each reviewer gets one review task. All must approve to move on.
          </p>
          <ReviewerPickerList value={reviewers} onChange={setReviewers} disabled={mutation.isPending} />
        </ModalSection>

        <ModalSection label="Materials">
          <PaperclipAttach
            label="Attach materials"
            files={files}
            onChange={setFiles}
            hint={isResubmit ? 'Optional — resubmit with existing files' : undefined}
          />
        </ModalSection>

        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!valid || mutation.isPending}
            className={!valid ? 'opacity-40' : ''}
          >
            {mutation.isPending
              ? 'Submitting…'
              : isResubmit
              ? 'Resubmit for review'
              : 'Submit for review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
