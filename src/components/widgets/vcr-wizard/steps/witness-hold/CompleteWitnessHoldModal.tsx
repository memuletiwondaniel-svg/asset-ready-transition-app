import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Paperclip, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WHPoint } from '@/components/p2a-workspace/handover-points/vcr-standard/deliverables/useWHPoints';

/**
 * FE-2: Complete modal (SCHEDULED / REWORK_REQUESTED → UNDER_REVIEW).
 * Delivering party submits: outcome summary*, attachments*, comments.
 */

export interface CompleteWitnessHoldModalProps {
  point: WHPoint;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmitted?: () => void;
}

export const CompleteWitnessHoldModal: React.FC<CompleteWitnessHoldModalProps> = ({
  point, open, onOpenChange, onSubmitted,
}) => {
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState('');
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;
    setOutcome(point.outcome_summary || '');
    setComment('');
    setFiles([]);
  }, [open, point]);

  const canSubmit = outcome.trim().length > 0 && files.length > 0;

  const submitting = useMutation({
    mutationFn: async () => {
      const c = supabase as any;
      const { data: u } = await c.auth.getUser();

      // 1. Upload attachments
      for (const f of files) {
        const path = `wh/${point.id}/${crypto.randomUUID()}-${f.name}`;
        const up = await c.storage.from('p2a-attachments').upload(path, f);
        if (up.error) throw up.error;
        const insEv = await c.from('p2a_itp_attachments').insert({
          itp_activity_id: point.id,
          kind: 'evidence',
          file_path: path,
          file_name: f.name,
          uploaded_by: u.user?.id ?? null,
        });
        if (insEv.error) throw insEv.error;
      }

      // 2. Update activity → UNDER_REVIEW + outcome
      const upd = await c
        .from('p2a_itp_activities')
        .update({
          status: 'UNDER_REVIEW',
          outcome_summary: outcome.trim(),
        })
        .eq('id', point.id);
      if (upd.error) throw upd.error;

      // 3. Log
      await c.from('p2a_itp_activity_log').insert({
        itp_activity_id: point.id,
        user_id: u.user?.id ?? null,
        action: 'submitted',
        comment: comment.trim() || null,
      });

      // 4. Reset any prior accepting-party decisions to PENDING (rework path)
      const resetRes = await c
        .from('p2a_itp_accepting_parties')
        .update({ status: 'PENDING', comment: null, decided_at: null })
        .eq('itp_activity_id', point.id)
        .neq('status', 'PENDING');
      if (resetRes.error) throw resetRes.error;
    },
    onSuccess: () => {
      toast.success('Submitted for review');
      qc.invalidateQueries({ queryKey: ['wh-points', point.handover_point_id] });
      onSubmitted?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to submit'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 !z-[1600]" overlayClassName="bg-black/80 backdrop-blur-sm !z-[1600]">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-base font-medium">
            {point.status === 'REWORK_REQUESTED' ? 'Resubmit for review' : 'Complete point'}
          </DialogTitle>
          <DialogDescription className="text-xs">{point.activity_name}</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Outcome summary <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Describe what was witnessed / the result of the hold check…"
              className="text-sm min-h-[100px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Attachments <span className="text-destructive">*</span>
            </label>
            <label className={cn(
              'flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs cursor-pointer hover:bg-muted/40',
              files.length === 0 ? 'border-destructive/50 text-destructive' : 'border-border/60 text-muted-foreground',
            )}>
              <Upload className="w-3.5 h-3.5" />
              Attach evidence (photos, signed sheets, ITR)
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && setFiles((p) => [...p, ...Array.from(e.target.files!)])}
              />
            </label>
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate flex-1">{f.name}</span>
                    <button onClick={() => setFiles((a) => a.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Comments (optional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything the accepting parties should know before reviewing…"
              className="text-sm min-h-[60px]"
            />
          </div>
        </div>

        <div className="px-6 py-3 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={!canSubmit || submitting.isPending} onClick={() => submitting.mutate()}>
            {submitting.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            Submit for review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
