import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { WizardActivity } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: string;
  onAdd: (activity: WizardActivity) => void;
}

export const AddCustomActivityDialog: React.FC<Props> = ({ open, onOpenChange, phase, onAdd }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    if (!name) return;
    onAdd({
      id: `custom-${Date.now()}`,
      catalogId: `CUSTOM-${Date.now()}`,
      name,
      description: description || null,
      phase,
      area: 'ORM',
      entryType: 'activity',
      requirementLevel: 'optional',
      estimatedManhours: null,
      discipline: null,
      selected: true,
      durationDays: null,
      startDate: '',
      endDate: '',
      predecessorIds: [],
    });
    setName('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Activity Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!name}>Add Activity</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
