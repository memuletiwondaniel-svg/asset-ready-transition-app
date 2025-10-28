import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Send,
  Edit,
  Plus,
  X,
  CheckCircle,
  UserCheck,
  UserX,
  UserMinus,
  ArrowLeft,
  Save,
  Video,
  Mail,
  ExternalLink
} from 'lucide-react';

interface PSSRData {
  reason?: string;
  plant?: string;
  projectId?: string;
  projectName?: string;
  asset?: string;
  scope?: string;
  approvers?: any[];
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  title: string;
  avatar: string;
  status: 'invited' | 'accepted' | 'declined' | 'tentative' | 'no_response';
  required: boolean;
}

interface PSSREvent {
  id: string;
  type: 'kickoff' | 'walkdown' | 'sof';
  title: string;
  date: Date;
  time: string;
  venue?: string;
  attendees: Attendee[];
  message: string;
  status: 'draft' | 'scheduled' | 'completed';
  responses: {
    accepted: number;
    declined: number;
    tentative: number;
    no_response: number;
  };
}

interface PSSRStepFourProps {
  data: PSSRData;
  onDataUpdate: (stepData: any) => void;
  onNext: () => void;
  onBack: () => void;
  onSave: () => void;
}

const PSSRStepFour: React.FC<PSSRStepFourProps> = ({ 
  data, 
  onDataUpdate, 
  onNext, 
  onBack, 
  onSave 
}) => {
  const [events, setEvents] = useState<PSSREvent[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [currentEventType, setCurrentEventType] = useState<'kickoff' | 'walkdown' | 'sof'>('kickoff');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [venue, setVenue] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [eventAttendees, setEventAttendees] = useState<Attendee[]>([]);
  const [showAddAttendeeModal, setShowAddAttendeeModal] = useState(false);
  const [newAttendeeName, setNewAttendeeName] = useState('');
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
  const [newAttendeeTitle, setNewAttendeeTitle] = useState('');

  // Mock attendees based on PSSR approvers and team members
  const defaultAttendees: Attendee[] = [
    {
      id: '1',
      name: 'Ahmed Al-Rashid',
      email: 'ahmed.alrashid@company.com',
      title: 'PSSR Lead',
      avatar: '/lovable-uploads/a115d6ee-9a4b-412e-993e-37839ae158ea.png',
      status: 'no_response',
      required: true
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      title: 'Project Manager',
      avatar: '/lovable-uploads/b229716e-e39e-41cb-91d3-2c30dd517fa8.png',
      status: 'no_response',
      required: true
    },
    {
      id: '3',
      name: 'Omar Hassan',
      email: 'omar.hassan@company.com',
      title: 'Plant Director',
      avatar: '/lovable-uploads/c25af318-1854-4091-9988-8579bc708185.png',
      status: 'no_response',
      required: true
    },
    {
      id: '4',
      name: 'Maria Garcia',
      email: 'maria.garcia@company.com',
      title: 'Engineering Manager (P&E)',
      avatar: '/lovable-uploads/cddd513b-3271-4c91-900a-87e4e290c4a9.png',
      status: 'no_response',
      required: false
    },
    {
      id: '5',
      name: 'John Smith',
      email: 'john.smith@company.com',
      title: 'Engineering Manager (Asset)',
      avatar: '/lovable-uploads/f183d942-af72-43b6-8db2-66997da17688.png',
      status: 'no_response',
      required: false
    }
  ];

  const generateDefaultMessage = (type: 'kickoff' | 'walkdown' | 'sof') => {
    const meetingType = type === 'kickoff' ? 'Kick-off' : type === 'walkdown' ? 'Walkdown' : 'Sign-off (SoF)';
    const baseMessage = `You are invited to attend the PSSR ${meetingType} meeting.

PSSR Details:
${data.projectId ? `Project ID: ${data.projectId}` : ''}
${data.projectName ? `Project Name: ${data.projectName}` : ''}
${data.plant ? `Plant: ${data.plant}` : ''}
Reason for PSSR: ${data.reason || 'Not specified'}

PSSR Scope:
${data.scope || 'Not specified'}

Please confirm your attendance.

ORSH Tool Link: ${window.location.origin}/pssr/${data.projectId || 'current'}

Best regards,
PSSR Team`;

    return baseMessage;
  };

  const generateEventTitle = (type: 'kickoff' | 'walkdown' | 'sof') => {
    const meetingType = type === 'kickoff' ? 'Kick-off' : type === 'walkdown' ? 'Walkdown' : 'Sign-off';
    if (data.reason === 'Start-up or Commissioning of a new Asset' && data.projectId && data.projectName) {
      return `PSSR ${meetingType}: ${data.projectId}: ${data.projectName}`;
    } else {
      const plant = data.plant || data.asset || 'Plant';
      const reasonShort = data.reason?.includes('TAR') ? 'TAR' : 'Restart';
      return `PSSR ${meetingType}: ${plant} ${reasonShort}`;
    }
  };

  const handleScheduleEvent = (type: 'kickoff' | 'walkdown' | 'sof') => {
    setCurrentEventType(type);
    setSelectedDate(undefined);
    setSelectedTime('09:00');
    setVenue(type === 'walkdown' ? 'Site Location - TBD' : type === 'sof' ? 'Conference Room - TBD' : '');
    setInviteMessage(generateDefaultMessage(type));
    setEventAttendees([...defaultAttendees]);
    setShowScheduleModal(true);
  };

  const handleSendInvite = () => {
    if (!selectedDate) {
      toast({ title: 'Please select a date', variant: 'destructive' });
      return;
    }

    const newEvent: PSSREvent = {
      id: `${currentEventType}-${Date.now()}`,
      type: currentEventType,
      title: generateEventTitle(currentEventType),
      date: selectedDate,
      time: selectedTime,
      venue: currentEventType === 'walkdown' ? venue : undefined,
      attendees: [...eventAttendees],
      message: inviteMessage,
      status: 'scheduled',
      responses: {
        accepted: 0,
        declined: 0,
        tentative: 0,
        no_response: eventAttendees.length
      }
    };

    setEvents(prev => [...prev, newEvent]);
    setShowScheduleModal(false);

    // Simulate sending invite via Outlook/Teams
    toast({ 
      title: 'Invite Sent Successfully', 
      description: `${currentEventType === 'kickoff' ? 'Kick-off' : 'Walkdown'} invite sent to ${eventAttendees.length} attendees via Microsoft Outlook.` 
    });

    // Mock updating some responses after a delay
    setTimeout(() => {
      setEvents(prev => prev.map(event => 
        event.id === newEvent.id 
          ? {
              ...event,
              attendees: event.attendees.map((attendee, index) => ({
                ...attendee,
                status: index < 2 ? 'accepted' : index < 4 ? 'tentative' : 'no_response'
              })),
              responses: {
                accepted: 2,
                declined: 0,
                tentative: 2,
                no_response: event.attendees.length - 4
              }
            }
          : event
      ));
    }, 3000);
  };

  const addAttendee = () => {
    if (!newAttendeeName || !newAttendeeEmail) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const newAttendee: Attendee = {
      id: `custom-${Date.now()}`,
      name: newAttendeeName,
      email: newAttendeeEmail,
      title: newAttendeeTitle || 'Team Member',
      avatar: '/lovable-uploads/a115d6ee-9a4b-412e-993e-37839ae158ea.png',
      status: 'no_response',
      required: false
    };

    setEventAttendees(prev => [...prev, newAttendee]);
    setNewAttendeeName('');
    setNewAttendeeEmail('');
    setNewAttendeeTitle('');
    setShowAddAttendeeModal(false);
    
    toast({ title: 'Attendee added successfully' });
  };

  const removeAttendee = (attendeeId: string) => {
    const attendee = eventAttendees.find(a => a.id === attendeeId);
    if (attendee?.required) {
      toast({ title: 'Cannot remove required attendee', variant: 'destructive' });
      return;
    }

    setEventAttendees(prev => prev.filter(a => a.id !== attendeeId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'declined': return <UserX className="h-4 w-4 text-red-600" />;
      case 'tentative': return <UserMinus className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-600 bg-green-50 border-green-200';
      case 'declined': return 'text-red-600 bg-red-50 border-red-200';
      case 'tentative': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return [`${hour}:00`, `${hour}:30`];
  }).flat();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Schedule PSSR Activities</h3>
              <p className="text-sm text-blue-700">
                Schedule kick-off and walkdown events for your PSSR. Invites will be sent via Microsoft Outlook.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Event Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleScheduleEvent('kickoff')}>
          <CardContent className="p-6 text-center">
            <Video className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Schedule PSSR Kick-off</h3>
            <p className="text-sm text-gray-600 mb-4">
              Organize the initial PSSR kick-off meeting to review scope and objectives
            </p>
            <Button className="w-full">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule Kick-off
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleScheduleEvent('walkdown')}>
          <CardContent className="p-6 text-center">
            <MapPin className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Schedule PSSR Walkdown</h3>
            <p className="text-sm text-gray-600 mb-4">
              Plan the physical site walkdown to verify checklist items on location
            </p>
            <Button className="w-full" variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Schedule Walkdown
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleScheduleEvent('sof')}>
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Schedule SoF Meeting</h3>
            <p className="text-sm text-gray-600 mb-4">
              Schedule the Sign-off (SoF) meeting to finalize and approve the PSSR
            </p>
            <Button className="w-full" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Schedule SoF Meeting
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Timeline View - Show when all 3 events are scheduled */}
      {events.length === 3 && (
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              PSSR Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-green-500 to-purple-500" />
              
              <div className="space-y-8">
                {[...events].sort((a, b) => a.date.getTime() - b.date.getTime()).map((event, index) => (
                  <div key={event.id} className="relative pl-20">
                    {/* Timeline dot */}
                    <div className={`absolute left-5 w-6 h-6 rounded-full border-4 border-white shadow-md ${
                      event.type === 'kickoff' ? 'bg-blue-500' : 
                      event.type === 'walkdown' ? 'bg-green-500' : 'bg-purple-500'
                    }`} />
                    
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={event.type === 'kickoff' ? 'default' : event.type === 'walkdown' ? 'secondary' : 'outline'} 
                                 className={event.type === 'sof' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}>
                            {event.type === 'kickoff' ? 'Kick-off' : event.type === 'walkdown' ? 'Walkdown' : 'SoF Meeting'}
                          </Badge>
                          <span className="text-sm font-medium text-gray-600">
                            {format(event.date, 'MMM dd, yyyy')} at {event.time}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-900">{event.title}</h4>
                      {event.venue && (
                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {event.venue}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs mt-2">
                        <span className="text-green-600">{event.responses.accepted} Accepted</span>
                        <span className="text-yellow-600">{event.responses.tentative} Tentative</span>
                        <span className="text-gray-600">{event.responses.no_response} Pending</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Events */}
      {events.length > 0 && events.length < 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Scheduled Events ({events.length}/3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={event.type === 'kickoff' ? 'default' : event.type === 'walkdown' ? 'secondary' : 'outline'}
                                 className={event.type === 'sof' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}>
                            {event.type === 'kickoff' ? 'Kick-off' : event.type === 'walkdown' ? 'Walkdown' : 'SoF Meeting'}
                          </Badge>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {event.status}
                          </Badge>
                        </div>
                        <h4 className="font-medium mb-1">{event.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {format(event.date, 'MMM dd, yyyy')}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {event.time}
                          </span>
                          {event.venue && (
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {event.venue}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="flex items-center text-green-600">
                            <UserCheck className="h-4 w-4 mr-1" />
                            {event.responses.accepted} Accepted
                          </span>
                          <span className="flex items-center text-yellow-600">
                            <UserMinus className="h-4 w-4 mr-1" />
                            {event.responses.tentative} Tentative
                          </span>
                          <span className="flex items-center text-red-600">
                            <UserX className="h-4 w-4 mr-1" />
                            {event.responses.declined} Declined
                          </span>
                          <span className="flex items-center text-gray-600">
                            <Clock className="h-4 w-4 mr-1" />
                            {event.responses.no_response} No Response
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center space-x-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Approvers</span>
        </Button>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onSave} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Save</span>
          </Button>
          <Button onClick={onNext} className="flex items-center space-x-2">
            <span>Continue</span>
          </Button>
        </div>
      </div>

      {/* Schedule Event Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {currentEventType === 'kickoff' ? <Video className="h-6 w-6" /> : 
               currentEventType === 'walkdown' ? <MapPin className="h-6 w-6" /> : 
               <Users className="h-6 w-6" />}
              <span>Schedule PSSR {currentEventType === 'kickoff' ? 'Kick-off' : 
                                   currentEventType === 'walkdown' ? 'Walkdown' : 'Sign-off Meeting'}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Date and Time Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Time *</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50 max-h-40">
                    {timeSlots.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Venue (for walkdown and sof) */}
            {(currentEventType === 'walkdown' || currentEventType === 'sof') && (
              <div>
                <Label>Venue *</Label>
                <Input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder={currentEventType === 'walkdown' ? 'Enter walkdown location/venue' : 'Enter meeting room/venue'}
                  className="mt-1"
                />
              </div>
            )}

            {/* Attendees */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base">Attendees ({eventAttendees.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddAttendeeModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Attendee
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {eventAttendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={attendee.avatar} alt={attendee.name} />
                        <AvatarFallback className="text-xs">
                          {attendee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{attendee.name}</p>
                        <p className="text-xs text-gray-600">{attendee.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {attendee.required && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                      {!attendee.required && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttendee(attendee.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invite Message */}
            <div>
              <Label>Invite Message</Label>
              <Textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={8}
                className="mt-1 font-mono text-sm"
                placeholder="Enter the invite message..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendInvite} className="flex items-center space-x-2">
                <Send className="h-4 w-4" />
                <span>Send Invite</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Attendee Modal */}
      <Dialog open={showAddAttendeeModal} onOpenChange={setShowAddAttendeeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Attendee</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newAttendeeName}
                onChange={(e) => setNewAttendeeName(e.target.value)}
                placeholder="Enter attendee name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={newAttendeeEmail}
                onChange={(e) => setNewAttendeeEmail(e.target.value)}
                placeholder="Enter email address"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Title</Label>
              <Input
                value={newAttendeeTitle}
                onChange={(e) => setNewAttendeeTitle(e.target.value)}
                placeholder="Enter job title"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddAttendeeModal(false)}>
                Cancel
              </Button>
              <Button onClick={addAttendee}>
                Add Attendee
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PSSRStepFour;