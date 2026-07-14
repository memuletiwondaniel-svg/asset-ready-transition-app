import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcrLabel: string; // e.g. "VCR-02 (OSBL)"
  disciplineChips: { name: string; complete: boolean }[];
  isHydrocarbon: boolean;
  isSubmitting: boolean;
  onConfirm: (summary: string) => Promise<void> | void;
  onScheduleSofMeeting?: () => void;
}

const MIN_CHARS = 30;

export const InterdisciplinarySummaryModal: React.FC<Props> = ({
  open,
  onOpenChange,
  vcrLabel,
  disciplineChips,
  isHydrocarbon,
  isSubmitting,
  onConfirm,
  onScheduleSofMeeting,
}) => {
  const [summary, setSummary] = useState('');
  const [stage, setStage] = useState<'edit' | 'confirmed'>('edit');

  const trimmed = summary.trim();
  const canSubmit = trimmed.length >= MIN_CHARS && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onConfirm(trimmed);
    setStage('confirmed');
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      // reset on close
      setTimeout(() => {
        setSummary('');
        setStage('edit');
      }, 200);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl border-none bg-neutral-950 text-neutral-100 p-0 overflow-hidden">
        <DialogTitle className="sr-only">Interdisciplinary Summary</DialogTitle>
        {stage === 'edit' ? (
          <div className="p-6 space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-neutral-400">{vcrLabel}</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Interdisciplinary summary</h2>
              <p className="mt-1 text-sm text-neutral-400">
                All {disciplineChips.length} discipline statements received. Your summary completes this VCR.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {disciplineChips.map((c) => (
                <span
                  key={c.name}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border',
                    c.complete
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700',
                  )}
                >
                  {c.complete && <CheckCircle2 className="w-3 h-3" />}
                  {c.name}
                </span>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300">Summary statement</label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Cross-discipline readiness position for start-up"
                className="mt-1.5 min-h-[130px] bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 focus-visible:ring-neutral-600"
                style={{ fontSize: '13px' }}
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                {trimmed.length}/{MIN_CHARS} minimum characters
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => handleClose(false)} className="text-neutral-300 hover:text-white hover:bg-neutral-800">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-white text-neutral-900 hover:bg-neutral-200">
                Confirm and complete VCR
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{vcrLabel} completed</h2>
              <p className="mt-1 text-sm text-neutral-400">
                {isHydrocarbon
                  ? 'Summary recorded — SoF certificate unlocked for approval.'
                  : 'Summary recorded.'}
              </p>
            </div>

            {isHydrocarbon && (
              <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-left">
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-neutral-300 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Schedule the SoF meeting?</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Task is already in your list either way.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={() => handleClose(false)} className="text-neutral-300 hover:text-white hover:bg-neutral-800">
                    Later
                  </Button>
                  <Button
                    onClick={() => {
                      handleClose(false);
                      onScheduleSofMeeting?.();
                    }}
                    className="bg-white text-neutral-900 hover:bg-neutral-200"
                  >
                    Schedule SoF meeting
                  </Button>
                </div>
              </div>
            )}

            {!isHydrocarbon && (
              <Button onClick={() => handleClose(false)} className="bg-white text-neutral-900 hover:bg-neutral-200">
                Close
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
