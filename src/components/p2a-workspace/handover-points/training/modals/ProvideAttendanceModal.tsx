import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

export const ProvideAttendanceModal: React.FC<Props> = ({
  trainingId, trainingTitle, provider, open, onOpenChange,
}) => {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const mutation = useTrainingActions(trainingId);

  useEffect(() => {
    if (open) setFiles([]);
  }, [open]);

  const valid = files.length > 0;

  const submit = async () => {
    if (!valid) return;
    await mutation.mutateAsync({
      action: 'provide_attendance',
      files: files.map((f) => ({ file: f.file, kind: 'attendance' })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[1420]">
        <DialogHeader>
          <ModalTitleBlock title="Provide attendance list" trainingTitle={trainingTitle} provider={provider} />
        </DialogHeader>

        <ModalSection label="Attendance list">
          <p className="text-[11.5px] text-muted-foreground -mt-0.5">
            Upload the list of invitees. Their names auto-flow into the Schedule step notes.
          </p>
          <PaperclipAttach
            label="Attach attendance list"
            files={files}
            onChange={setFiles}
            multiple={false}
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
            {mutation.isPending ? 'Uploading…' : 'Provide attendance list'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
