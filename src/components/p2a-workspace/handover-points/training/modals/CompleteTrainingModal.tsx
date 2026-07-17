import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTrainingActions } from '../useTrainingActions';
import { ModalTitleBlock, ModalSection } from './ModalPrimitives';
import { PaperclipAttach, AttachedFile } from './PaperclipAttach';

interface Props {
  trainingId: string;
  trainingTitle: string;
  provider?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CompleteTrainingModal: React.FC<Props> = ({
  trainingId, trainingTitle, provider, open, onOpenChange,
}) => {
  const [summary, setSummary] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const mutation = useTrainingActions(trainingId);

  useEffect(() => {
    if (open) {
      setSummary('');
      setFiles([]);
    }
  }, [open]);

  const valid = summary.trim().length > 0;

  const submit = async () => {
    if (!valid) return;
    await mutation.mutateAsync({
      action: 'complete_training',
      payload: { outcome_summary: summary.trim() },
      files: files.map((f) => ({ file: f.file, kind: 'evidence' })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[1510]">
        <DialogHeader>
          <ModalTitleBlock title="Complete training" trainingTitle={trainingTitle} provider={provider} />
        </DialogHeader>

        <ModalSection label="Outcome">
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summarise the session and attendance outcomes"
            className="min-h-[100px] text-[12.5px]"
          />
        </ModalSection>

        <ModalSection label="Evidence">
          <PaperclipAttach
            label="Attach evidence"
            files={files}
            onChange={setFiles}
            hint="Signed sheets, certificates…"
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
            {mutation.isPending ? 'Saving…' : 'Mark complete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
