import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Clock, MapPin, Mail, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Attendee {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email: string;
}

interface ScheduleActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityName: string;
  activityType: string;
  existingDate?: string;
  existingAttendees?: number;
}

const mockAttendees: Attendee[] = [
  {
    id: '1',
    name: 'Dr. Sarah Wilson',
    role: 'Process Engineering TA',
    avatar: '/lovable-uploads/a115d6ee-9a4b-412e-993e-37839ae158ea.png',
    email: 'sarah.wilson@company.com'
  },
  {
    id: '2',
    name: 'John Smith',
    role: 'Technical Safety TA',
    avatar: '/lovable-uploads/b229716e-e39e-41cb-91d3-2c30dd517fa8.png',
    email: 'john.smith@company.com'
  },
  {
    id: '3',
    name: 'Maria Garcia',
    role: 'Mechanical Static TA',
    avatar: '/lovable-uploads/c25af318-1854-4091-9988-8579bc708185.png',
    email: 'maria.garcia@company.com'
  },
  {
    id: '4',
    name: 'Omar Hassan',
    role: 'Deputy Plant Director',
    avatar: '/lovable-uploads/cddd513b-3271-4c91-900a-87e4e290c4a9.png',
    email: 'omar.hassan@company.com'
  }
];

export const ScheduleActivityModal: React.FC<ScheduleActivityModalProps> = ({
  open,
  onOpenChange,
  activityName,
  activityType,
  existingDate,
  existingAttendees
}) => {
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(
    existingDate ? new Date(existingDate) : undefined
  );
  const [time, setTime] = useState<string>('09:00');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [sendInvitations, setSendInvitations] = useState<boolean>(true);

  const handleToggleAttendee = (attendeeId: string) => {
    setSelectedAttendees(prev =>
      prev.includes(attendeeId)
        ? prev.filter(id => id !== attendeeId)
        : [...prev, attendeeId]
    );
  };

  const handleSchedule = () => {
    if (!date) {
      toast({
        title: 'Date Required',
        description: 'Please select a date for the activity.',
        variant: 'destructive'
      });
      return;
    }

    if (selectedAttendees.length === 0) {
      toast({
        title: 'Attendees Required',
        description: 'Please select at least one attendee.',
        variant: 'destructive'
      });
      return;
    }

    // Here you would typically call an API to schedule the activity
    toast({
      title: 'Activity Scheduled',
      description: `${activityName} has been scheduled for ${format(date, 'PPP')} at ${time}.${
        sendInvitations ? ' Invitations have been sent to attendees.' : ''
      }`
    });

    onOpenChange(false);
  };

  const handleSendReminders = () => {
    toast({
      title: 'Reminders Sent',
      description: `Reminders have been sent to ${selectedAttendees.length} attendee(s).`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Schedule {activityName}
          </DialogTitle>
          <DialogDescription>
            Set up the meeting details and invite attendees for this PSSR activity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Conference Room A, Building 3"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Add agenda items, preparation requirements, or other relevant information..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Attendees Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Attendees *</Label>
              <Badge variant="secondary">
                {selectedAttendees.length} selected
              </Badge>
            </div>
            <div className="border border-border rounded-lg divide-y divide-border">
              {mockAttendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedAttendees.includes(attendee.id)}
                    onCheckedChange={() => handleToggleAttendee(attendee.id)}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={attendee.avatar} alt={attendee.name} />
                    <AvatarFallback>{attendee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{attendee.name}</p>
                    <p className="text-xs text-muted-foreground">{attendee.role}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Mail className="h-3 w-3 mr-1" />
                    {attendee.email}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Send Invitations */}
          <div className="flex items-center space-x-2 p-4 bg-accent/30 rounded-lg">
            <Checkbox
              id="send-invitations"
              checked={sendInvitations}
              onCheckedChange={(checked) => setSendInvitations(checked as boolean)}
            />
            <Label
              htmlFor="send-invitations"
              className="text-sm font-medium cursor-pointer"
            >
              Send email invitations to selected attendees
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {existingDate && (
            <Button
              variant="outline"
              onClick={handleSendReminders}
              className="mr-auto"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Reminders
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSchedule}>
            {existingDate ? 'Update Activity' : 'Schedule Activity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
