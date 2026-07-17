import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export const ProvidePOModal: React.FC<Props> = ({
  trainingId, trainingTitle, provider, open, onOpenChange,
}) => {
  const [poNumber, setPoNumber] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const mutation = useTrainingActions(trainingId);

  useEffect(() => {
    if (open) {
      setPoNumber('');
      setFiles([]);
    }
  }, [open]);

  const valid = poNumber.trim().length > 0;

  const submit = async () => {
    if (!valid) return;
    await mutation.mutateAsync({
      action: 'provide_po',
      payload: { po_number: poNumber.trim() },
      files: files.map((f) => ({ file: f.file, kind: 'po' })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[1510]">
        <DialogHeader>
          <ModalTitleBlock title="Provide PO" trainingTitle={trainingTitle} provider={provider} />
        </DialogHeader>

        <ModalSection label="PO number">
          <Input
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            placeholder="e.g. 4500987321"
            className="h-9 text-[13px]"
          />
        </ModalSection>

        <ModalSection label="Attachment">
          <PaperclipAttach
            label="Attach PO document"
            files={files}
            onChange={setFiles}
            multiple={false}
            hint="Optional"
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
            {mutation.isPending ? 'Submitting…' : 'Provide PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
