import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, MapPin, Clock, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PSSRKeyActivity } from '@/hooks/usePSSRKeyActivities';
import { toast } from 'sonner';

interface ScheduleActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: PSSRKeyActivity | null;
  pssrTitle?: string;
  onSchedule: (data: {
    activityId: string;
    scheduledDate: string;
    scheduledEndDate?: string;
    location?: string;
    notes?: string;
  }) => Promise<void>;
}

export const ScheduleActivitySheet: React.FC<ScheduleActivitySheetProps> = ({
  open,
  onOpenChange,
  activity,
  pssrTitle,
  onSchedule,
}) => {
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isScheduled = activity?.status === 'scheduled' || activity?.status === 'completed';

  const handleSchedule = async () => {
    if (!activity || !date) {
      toast.error('Please select a date');
      return;
    }

    setIsSubmitting(true);
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledDate = new Date(date);
      scheduledDate.setHours(hours, minutes, 0, 0);

      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const endDate = new Date(date);
      endDate.setHours(endHours, endMinutes, 0, 0);

      await onSchedule({
        activityId: activity.id,
        scheduledDate: scheduledDate.toISOString(),
        scheduledEndDate: endDate.toISOString(),
        location,
        notes,
      });

      toast.success(`${activity.label} scheduled successfully`);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to schedule activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDate(undefined);
    setTime('09:00');
    setEndTime('10:00');
    setLocation('');
    setNotes('');
  };

  if (!activity) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {isScheduled ? activity.label : `Schedule ${activity.label}`}
          </SheetTitle>
          <SheetDescription>
            {pssrTitle && <span className="text-xs">{pssrTitle}</span>}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {isScheduled ? (
            // View mode for already scheduled activities
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-600">Scheduled</span>
                </div>
                {activity.scheduled_date && (
                  <p className="text-sm font-medium">{format(new Date(activity.scheduled_date), 'EEEE, dd MMM yyyy')}</p>
                )}
                {activity.scheduled_date && activity.scheduled_end_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(activity.scheduled_date), 'HH:mm')} – {format(new Date(activity.scheduled_end_date), 'HH:mm')}
                  </p>
                )}
              </div>
              {activity.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{activity.location}</span>
                </div>
              )}
              {activity.notes && (
                <div>
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1">{activity.notes}</p>
                </div>
              )}
            </div>
          ) : (
            // Schedule form
            <>
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal mt-1',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Start Time</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">End Time</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Location</Label>
                <Input
                  placeholder="e.g. Conference Room B, Plant Office"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</Label>
                <Textarea
                  placeholder="Any additional notes or agenda items..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <Separator />

              <Button
                onClick={handleSchedule}
                disabled={!date || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Scheduling...' : 'Schedule Activity'}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
