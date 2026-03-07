import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { WizardActivity } from './types';
import { Calendar, Clock, Minus, Plus } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: string;
  onAdd: (activity: WizardActivity) => void;
}

export const AddCustomActivityDialog: React.FC<Props> = ({ open, onOpenChange, phase, onAdd }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setDurationDays(null);
    setStartDate('');
    setEndDate('');
  };

  const handleAdd = () => {
    if (!name) return;
    onAdd({
      id: `custom-${Date.now()}`,
      activityCode: `CUSTOM-${Date.now()}`,
      activity: name,
      description: description || null,
      phaseId: null,
      parentActivityId: null,
      durationHigh: null,
      durationMed: durationDays,
      durationLow: null,
      selected: true,
      durationDays,
      startDate,
      endDate,
      predecessorIds: [],
    });
    resetForm();
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[400px] sm:w-[450px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-base">Add Custom Activity</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-4">
          {/* Activity Name */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              placeholder="Enter activity name"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 min-h-[140px]"
              placeholder="Describe the activity scope and objectives..."
              rows={5}
            />
          </div>

          {/* Duration */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration (Days)</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setDurationDays(Math.max(1, (durationDays || 1) - 1))}
                disabled={!durationDays || durationDays <= 1}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input
                type="number"
                min={1}
                value={durationDays ?? ''}
                onChange={(e) => setDurationDays(e.target.value ? parseInt(e.target.value) : null)}
                className="text-center"
                placeholder="—"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setDurationDays((durationDays || 0) + 1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Start & End Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start Date</Label>
              <div className="relative mt-1.5">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End Date</Label>
              <div className="relative mt-1.5">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="border-t pt-3 pb-1 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!name}>Add Activity</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
