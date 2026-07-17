import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useTrainingActions } from '../useTrainingActions';
import { ModalTitleBlock, ModalSection } from './ModalPrimitives';
import type { TrainingAttachmentRow } from '../useTrainingLifecycle';

interface Props {
  trainingId: string;
  trainingTitle: string;
  provider?: string | null;
  attachments: TrainingAttachmentRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const bucketFor = (kind: string) => (kind === 'evidence' ? 'training-evidence' : 'training-materials');

const publicUrl = (a: TrainingAttachmentRow) => {
  if (!a.file_path) return null;
  return supabase.storage.from(bucketFor(a.kind)).getPublicUrl(a.file_path).data.publicUrl || null;
};

export const ScheduleTrainingModal: React.FC<Props> = ({
  trainingId, trainingTitle, provider, attachments, open, onOpenChange,
}) => {
  const [date, setDate] = useState<Date | undefined>();
  const [dateOpen, setDateOpen] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const mutation = useTrainingActions(trainingId);

  const prefilledNotes = useMemo(() => {
    // Include quick links to Materials + Attendance list as plain-text lines
    // so invitees receive them alongside session notes.
    const lines: string[] = [];
    const materials = attachments.filter((a) => a.kind === 'material' || a.kind === 'materials');
    const attendance = attachments.find((a) => a.kind === 'attendance');
    if (materials.length) {
      lines.push('Materials:');
      materials.forEach((m) => {
        const url = publicUrl(m);
        lines.push(url ? `• ${m.file_name} — ${url}` : `• ${m.file_name}`);
      });
    }
    if (attendance) {
      const url = publicUrl(attendance);
      lines.push('');
      lines.push(url ? `Attendance list: ${url}` : `Attendance list: ${attendance.file_name}`);
    }
    return lines.join('\n');
  }, [attachments]);

  useEffect(() => {
    if (!open) return;
    setDate(undefined);
    setStartTime('09:00');
    setEndTime('12:00');
    setLocation('');
    setNotes(prefilledNotes);
  }, [open, prefilledNotes]);

  const valid = !!date && !!startTime && !!endTime && location.trim().length > 0;

  const submit = async () => {
    if (!valid || !date) return;
    await mutation.mutateAsync({
      action: 'schedule_training',
      payload: {
        scheduled_date: format(date, 'yyyy-MM-dd'),
        scheduled_start_time: startTime,
        scheduled_end_time: endTime,
        scheduled_location: location.trim(),
        scheduled_notes: notes,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg z-[1510]">
        <DialogHeader>
          <ModalTitleBlock title="Schedule training" trainingTitle={trainingTitle} provider={provider} />
        </DialogHeader>

        <ModalSection label="When">
          <div className="grid grid-cols-3 gap-2">
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'h-9 justify-start text-[13px] font-normal col-span-1',
                    !date && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                  {date ? format(date, 'd MMM yyyy') : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[1510] pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { setDate(d); setDateOpen(false); }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-9 text-[13px]"
              aria-label="Start time"
            />
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-9 text-[13px]"
              aria-label="End time"
            />
          </div>
        </ModalSection>

        <ModalSection label="Location">
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Room / site / video link"
              className="pl-8 h-9 text-[13px]"
            />
          </div>
        </ModalSection>

        <ModalSection label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Session notes (prefilled with material and attendance links)"
            className="min-h-[110px] text-[12.5px] font-mono"
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
            {mutation.isPending ? 'Scheduling…' : 'Schedule training'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
