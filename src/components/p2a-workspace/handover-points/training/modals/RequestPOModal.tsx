import React from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTrainingActions } from '../useTrainingActions';
import { ModalTitleBlock } from './ModalPrimitives';

interface Props {
  trainingId: string;
  trainingTitle: string;
  provider?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RequestPOModal: React.FC<Props> = ({
  trainingId, trainingTitle, provider, open, onOpenChange,
}) => {
  const mutation = useTrainingActions(trainingId);

  const submit = async () => {
    await mutation.mutateAsync({ action: 'request_po' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm z-[1420]">
        <DialogHeader>
          <ModalTitleBlock title="Request PO" trainingTitle={trainingTitle} provider={provider} />
        </DialogHeader>
        <p className="text-[12.5px] text-muted-foreground" style={{ marginTop: '18px' }}>
          This routes the deliverable to the Project Engineer to raise the PO.
        </p>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Requesting…' : 'Request PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
