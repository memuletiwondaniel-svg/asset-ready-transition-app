import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, MapPin, Users, Loader2, ExternalLink, Wifi, Mail, Bell, Wrench, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePSSRWalkdowns, WalkdownAttendee, WalkdownDiscipline } from '@/hooks/usePSSRWalkdowns';
import { useWalkdownSuggestedAttendees, SuggestedAttendee } from '@/hooks/useWalkdownSuggestedAttendees';
import { usePSSRDetails } from '@/hooks/usePSSRDetails';
import { useMicrosoftOAuth } from '@/hooks/useMicrosoftOAuth';
import { useOutlookCalendar } from '@/hooks/useOutlookCalendar';
import { useDisciplines } from '@/hooks/useDisciplines';
import { openInOutlook, openInTeams, OutlookMeetingData, ReminderOption } from '@/lib/outlook-protocol';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeProfile } from '@/hooks/useRealtimeProfile';
import { supabase } from '@/integrations/supabase/client';
import { AddAttendeePopover } from './AddAttendeePopover';
import { InvitationPreview } from './InvitationPreview';

interface ScheduleWalkdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  pssrTitle?: string;
}

// Wizard step definitions
const WIZARD_STEPS = [
  { id: 1, title: 'Method', description: 'Choose invitation method' },
  { id: 2, title: 'Details', description: 'Date, time & location' },
  { id: 3, title: 'Attendees', description: 'Select participants' },
  { id: 4, title: 'Review', description: 'Preview & confirm' },
];

export const ScheduleWalkdownModal: React.FC<ScheduleWalkdownModalProps> = ({
  open,
  onOpenChange,
  pssrId,
  pssrTitle,
}) => {
  const { scheduleWalkdown } = usePSSRWalkdowns(pssrId);
  const { pssr: pssrDetails } = usePSSRDetails(pssrId);
  const { isConnected: isMicrosoftConnected, connect: connectMicrosoft, isConnecting } = useMicrosoftOAuth();
  const { createEvent, isCreatingEvent } = useOutlookCalendar();
  const { disciplines: availableDisciplines, isLoading: disciplinesLoading } = useDisciplines();
  const { toast } = useToast();

  // Get current user's profile for invitation signature
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const { profile: currentUserProfile } = useRealtimeProfile(currentUserId);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    fetchUserId();
  }, []);

  // Wizard step state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Invitation method
  const [sendMethod, setSendMethod] = useState<'outlook' | 'teams' | 'api'>('outlook');

  // Step 2: Meeting details
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('');
  const [location, setLocation] = useState('');
  const [reminder, setReminder] = useState<ReminderOption>('1day');
  const [isDisciplineWalkdown, setIsDisciplineWalkdown] = useState(false);
  const [selectedDisciplineIds, setSelectedDisciplineIds] = useState<Set<string>>(new Set());

  // Step 3: Attendees
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set());
  const [manualAttendees, setManualAttendees] = useState<SuggestedAttendee[]>([]);
  const [customMessage, setCustomMessage] = useState<string | undefined>(undefined);

  // Get selected discipline names for filtering attendees
  const selectedDisciplineNames = isDisciplineWalkdown 
    ? availableDisciplines
        .filter(d => selectedDisciplineIds.has(d.id))
        .map(d => d.name)
    : [];

  // Pass discipline filter to attendee hook
  const { data: suggestedData, isLoading: suggestedLoading } = useWalkdownSuggestedAttendees(
    pssrId,
    selectedDisciplineNames.length > 0 ? selectedDisciplineNames : undefined
  );

  // Build PSSR link
  const pssrLink = `${window.location.origin}/pssr/${pssrId}`;
  const pssrScope = pssrDetails?.scope || '';

  // Build dynamic meeting title with disciplines
  const buildMeetingTitle = () => {
    let title = `PSSR Walkdown`;
    if (pssrTitle || pssrDetails?.title) {
      title += `: ${pssrTitle || pssrDetails?.title}`;
    }
    if (isDisciplineWalkdown && selectedDisciplineIds.size > 0) {
      const names = availableDisciplines
        .filter(d => selectedDisciplineIds.has(d.id))
        .map(d => d.name);
      title += ` – ${names.join(', ')}`;
    }
    return title;
  };

  const meetingTitle = buildMeetingTitle();

  // Combine suggested and manual attendees
  const allAttendees = [
    ...(suggestedData?.attendees || []),
    ...manualAttendees
  ];

  // Initialize selected attendees and location when suggested data loads
  useEffect(() => {
    if (suggestedData?.attendees) {
      setSelectedAttendeeIds(new Set(suggestedData.attendees.map(a => a.id)));
    }
    // Pre-populate location from PSSR location context
    if (suggestedData?.locationContext && !location) {
      const ctx = suggestedData.locationContext as any;
      const station = ctx.station;
      const field = ctx.field;
      const plant = ctx.plant || ctx.commission;
      const defaultLocation = [station, field, plant].filter(Boolean).join(', ');
      if (defaultLocation) {
        setLocation(defaultLocation);
      }
    }
  }, [suggestedData]);

  // Reset wizard when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setScheduledDate(undefined);
      setScheduledTime('');
      setLocation('');
      setSelectedAttendeeIds(new Set());
      setManualAttendees([]);
      setSendMethod('outlook');
      setReminder('1day');
      setCustomMessage(undefined);
      setIsDisciplineWalkdown(false);
      setSelectedDisciplineIds(new Set());
    }
  }, [open]);

  const handleAddManualAttendee = (attendee: SuggestedAttendee) => {
    if (!selectedAttendeeIds.has(attendee.id)) {
      setManualAttendees(prev => [...prev, attendee]);
      setSelectedAttendeeIds(prev => new Set([...prev, attendee.id]));
    }
  };

  const toggleAttendee = (attendeeId: string) => {
    setSelectedAttendeeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(attendeeId)) {
        newSet.delete(attendeeId);
      } else {
        newSet.add(attendeeId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedAttendeeIds(new Set(allAttendees.map(a => a.id)));
  };

  const deselectAll = () => {
    setSelectedAttendeeIds(new Set());
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Step validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return true; // Method is always selected with default
      case 2:
        if (!scheduledDate) {
          toast({ title: 'Date required', description: 'Please select a date for the walkdown.', variant: 'destructive' });
          return false;
        }
        return true;
      case 3:
        return true; // Attendees are optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!scheduledDate) return;

    // Build attendees array from selected IDs (includes both suggested and manual)
    const attendees: WalkdownAttendee[] = allAttendees
      .filter(a => selectedAttendeeIds.has(a.id))
      .map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        email: a.email
      }));

    // Build datetime strings
    const startDateTime = scheduledTime 
      ? `${format(scheduledDate, 'yyyy-MM-dd')}T${scheduledTime}:00`
      : `${format(scheduledDate, 'yyyy-MM-dd')}T09:00:00`;
    
    const endDate = new Date(startDateTime);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString().slice(0, 19);

    // Build selected disciplines
    const disciplines: WalkdownDiscipline[] = isDisciplineWalkdown 
      ? availableDisciplines
          .filter(d => selectedDisciplineIds.has(d.id))
          .map(d => ({ id: d.id, name: d.name }))
      : [];

    // Prepare meeting data for Outlook
    const meetingData: OutlookMeetingData = {
      title: meetingTitle,
      scope: pssrScope,
      description: customMessage,
      location: location || 'TBD',
      startDateTime,
      endDateTime,
      attendees: attendees.filter(a => a.email).map(a => ({ name: a.name, email: a.email! })),
      pssrId,
      pssrLink,
      reminder,
    };

    // First, create the walkdown event in the database
    const walkdownEvent = await scheduleWalkdown.mutateAsync({
      scheduledDate: format(scheduledDate, 'yyyy-MM-dd'),
      scheduledTime: scheduledTime || undefined,
      location: location || undefined,
      description: pssrScope || undefined,
      attendees,
      disciplines,
    });

    // Handle sending based on selected method
    if (sendMethod === 'outlook') {
      openInOutlook(meetingData);
      toast({
        title: "Opening Outlook",
        description: "Your calendar app should open with the pre-filled meeting details.",
      });
    } else if (sendMethod === 'teams') {
      openInTeams(meetingData);
      toast({
        title: "Opening Teams",
        description: "Microsoft Teams should open with the meeting scheduler.",
      });
    } else if (sendMethod === 'api' && isMicrosoftConnected && walkdownEvent?.id) {
      // Use OAuth integration for RSVP tracking
      await createEvent({
        walkdownEventId: walkdownEvent.id,
        title: meetingData.title,
        description: pssrScope,
        location: meetingData.location,
        startDateTime,
        endDateTime,
        attendees: attendees.filter(a => a.email).map(a => ({ 
          id: a.id, 
          name: a.name, 
          email: a.email!,
          role: a.role 
        })),
        pssrId,
      });
      toast({
        title: "Meeting Created",
        description: "Calendar invitations sent. RSVP tracking is enabled.",
      });
    }

    onOpenChange(false);
  };

  const selectedCount = selectedAttendeeIds.size;
  const totalCount = allAttendees.length;
  const isSubmitting = scheduleWalkdown.isPending || isCreatingEvent;
  const isLastStep = currentStep === WIZARD_STEPS.length;

  // Calculate progress percentage
  const progressPercent = ((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Schedule PSSR Walkdown
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="px-6 pb-4 flex-shrink-0">
          <div className="relative">
            {/* Track */}
            <div className="absolute top-4 left-6 right-6 h-1 rounded-full bg-muted" aria-hidden />
            {/* Progress */}
            <div
              className="absolute top-4 left-6 h-1 rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `calc(${progressPercent}% * 0.85)` }}
              aria-hidden
            />
            <ol className="relative flex justify-between">
              {WIZARD_STEPS.map((step) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                return (
                  <li key={step.id} className="flex flex-col items-center text-center z-10">
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300',
                        isCompleted
                          ? 'bg-primary border-primary text-primary-foreground'
                          : isCurrent
                            ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20'
                            : 'bg-background border-muted-foreground/30 text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-medium">{step.id}</span>
                      )}
                    </div>
                    <span className={cn(
                      'mt-2 text-xs font-medium transition-colors',
                      isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {step.title}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-6">
          {/* Step 1: Invitation Method */}
          {currentStep === 1 && (
            <div className="space-y-4 pb-4">
              <div className="text-center pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  How would you like to send the invitation?
                </h3>
              </div>

              <RadioGroup value={sendMethod} onValueChange={(v) => setSendMethod(v as 'outlook' | 'teams' | 'api')}>
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSendMethod('outlook')}>
                  <RadioGroupItem value="outlook" id="outlook" className="mt-0.5" />
                  <div className="flex-1">
                    <label htmlFor="outlook" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <ExternalLink className="w-4 h-4 text-primary" />
                      Open in Outlook
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Opens your Outlook app with all details pre-filled. Quick and seamless.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSendMethod('teams')}>
                  <RadioGroupItem value="teams" id="teams" className="mt-0.5" />
                  <div className="flex-1">
                    <label htmlFor="teams" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <ExternalLink className="w-4 h-4 text-[#6264A7]" />
                      Open in Teams
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Opens Microsoft Teams web meeting scheduler.
                    </p>
                  </div>
                </div>

                <div 
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                    isMicrosoftConnected ? "bg-card hover:bg-muted/50" : "bg-muted/20 opacity-70"
                  )} 
                  onClick={() => isMicrosoftConnected && setSendMethod('api')}
                >
                  <RadioGroupItem value="api" id="api" className="mt-0.5" disabled={!isMicrosoftConnected} />
                  <div className="flex-1">
                    <label htmlFor="api" className={cn("flex items-center gap-2 text-sm font-medium", isMicrosoftConnected ? "cursor-pointer" : "cursor-not-allowed")}>
                      <Wifi className="w-4 h-4 text-green-600" />
                      Send & Track RSVPs
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isMicrosoftConnected 
                        ? "Send invitations directly and track responses within ORSH."
                        : "Connect your Microsoft account in Settings to enable RSVP tracking."}
                    </p>
                    {!isMicrosoftConnected && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          connectMicrosoft();
                        }}
                        disabled={isConnecting}
                      >
                        {isConnecting ? "Connecting..." : "Connect Microsoft Account →"}
                      </Button>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 2: Date, Time, Location & Options */}
          {currentStep === 2 && (
            <div className="space-y-5 pb-4">
              <div className="text-center pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Set the walkdown schedule and location
                </h3>
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !scheduledDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Time
                  </Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    placeholder="Select time"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  Location / Meeting Point
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Main Control Room, Area 4 Gate"
                />
              </div>

              {/* Reminders */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5" />
                  Reminder
                </Label>
                <Select value={reminder} onValueChange={(v) => setReminder(v as ReminderOption)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reminder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No reminder</SelectItem>
                    <SelectItem value="15min">15 minutes before</SelectItem>
                    <SelectItem value="30min">30 minutes before</SelectItem>
                    <SelectItem value="1hour">1 hour before</SelectItem>
                    <SelectItem value="1day">1 day before</SelectItem>
                    <SelectItem value="1week">1 week before</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Discipline-Specific Walkdown */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                  <Checkbox
                    id="discipline-walkdown"
                    checked={isDisciplineWalkdown}
                    onCheckedChange={(checked) => {
                      setIsDisciplineWalkdown(checked as boolean);
                      if (!checked) setSelectedDisciplineIds(new Set());
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor="discipline-walkdown" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                      Discipline-Specific Walkdown
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Schedule a walkdown for specific discipline(s).
                    </p>
                  </div>
                </div>

                {isDisciplineWalkdown && (
                  <div className="border rounded-lg p-3 bg-muted/20">
                    {disciplinesLoading ? (
                      <div className="flex items-center justify-center py-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-xs">Loading disciplines...</span>
                      </div>
                    ) : availableDisciplines.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No disciplines configured
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {availableDisciplines.map(discipline => (
                          <div
                            key={discipline.id}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={`discipline-${discipline.id}`}
                              checked={selectedDisciplineIds.has(discipline.id)}
                              onCheckedChange={(checked) => {
                                setSelectedDisciplineIds(prev => {
                                  const newSet = new Set(prev);
                                  if (checked) {
                                    newSet.add(discipline.id);
                                  } else {
                                    newSet.delete(discipline.id);
                                  }
                                  return newSet;
                                });
                              }}
                            />
                            <label
                              htmlFor={`discipline-${discipline.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {discipline.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Attendees */}
          {currentStep === 3 && (
            <div className="space-y-5 pb-4">
              <div className="text-center pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Who should attend the walkdown?
                </h3>
              </div>

              {/* Attendees Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Walkdown Attendees
                  </Label>
                  <div className="flex items-center gap-2">
                    {totalCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {selectedCount} of {totalCount} selected
                      </span>
                    )}
                    <AddAttendeePopover
                      existingAttendeeIds={selectedAttendeeIds}
                      onAddAttendee={handleAddManualAttendee}
                    />
                  </div>
                </div>

                {suggestedLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm">Loading suggested attendees...</span>
                  </div>
                ) : allAttendees.length > 0 ? (
                  <div className="space-y-4 border rounded-lg p-3 bg-muted/30">
                    {/* Select/Deselect All */}
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={selectAll}
                        className="h-7 text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={deselectAll}
                        className="h-7 text-xs"
                      >
                        Deselect All
                      </Button>
                    </div>

                    {/* Categorized Suggested Attendees */}
                    {suggestedData?.categorized && suggestedData.categorized.map((category) => (
                      <div key={category.name} className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {category.name}
                        </h4>
                        <div className="space-y-1">
                          {category.attendees.map((attendee) => (
                            <AttendeeRow
                              key={attendee.id}
                              attendee={attendee}
                              isSelected={selectedAttendeeIds.has(attendee.id)}
                              onToggle={() => toggleAttendee(attendee.id)}
                              getInitials={getInitials}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Manually Added Attendees */}
                    {manualAttendees.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Manually Added
                        </h4>
                        <div className="space-y-1">
                          {manualAttendees.map((attendee) => (
                            <AttendeeRow
                              key={attendee.id}
                              attendee={{...attendee, source: 'responsible'}}
                              isSelected={selectedAttendeeIds.has(attendee.id)}
                              onToggle={() => toggleAttendee(attendee.id)}
                              getInitials={getInitials}
                              showManualBadge
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-center">
                    <p className="text-sm text-muted-foreground">
                      No matching attendees found for this PSSR's checklist items.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use "Add Attendee" to manually add participants.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Review & Preview */}
          {currentStep === 4 && (
            <div className="space-y-5 pb-4">
              <div className="text-center pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Review your invitation before sending
                </h3>
              </div>

              {/* Invitation Preview */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  Invitation Preview
                </Label>
                <InvitationPreview
                  subject={meetingTitle}
                  scope={pssrScope}
                  date={scheduledDate}
                  time={scheduledTime}
                  location={location}
                  pssrLink={pssrLink}
                  customMessage={customMessage}
                  onCustomMessageChange={setCustomMessage}
                  senderName={currentUserProfile?.full_name || undefined}
                  senderPosition={currentUserProfile?.position || undefined}
                  senderEmail={currentUserProfile?.email || undefined}
                />
              </div>

              {/* Summary */}
              <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                <h4 className="text-sm font-medium">Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-medium">{scheduledDate ? format(scheduledDate, 'PPP') : 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <p className="font-medium">{scheduledTime || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="font-medium">{location || 'TBD'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Attendees:</span>
                    <p className="font-medium">{selectedCount} selected</p>
                  </div>
                </div>
                {isDisciplineWalkdown && selectedDisciplineIds.size > 0 && (
                  <div>
                    <span className="text-muted-foreground text-sm">Disciplines:</span>
                    <p className="font-medium text-sm">
                      {availableDisciplines
                        .filter(d => selectedDisciplineIds.has(d.id))
                        .map(d => d.name)
                        .join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t bg-muted/30">
          <div className="flex w-full justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
            >
              {currentStep === 1 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </>
              )}
            </Button>

            {isLastStep ? (
              <Button 
                onClick={handleSubmit}
                disabled={!scheduledDate || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {sendMethod === 'api' ? 'Sending...' : 'Scheduling...'}
                  </>
                ) : (
                  <>
                    {sendMethod === 'outlook' && <ExternalLink className="w-4 h-4 mr-2" />}
                    {sendMethod === 'teams' && <ExternalLink className="w-4 h-4 mr-2" />}
                    {sendMethod === 'api' && <Wifi className="w-4 h-4 mr-2" />}
                    Schedule Walkdown
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Separate component for attendee row to keep things clean
interface AttendeeRowProps {
  attendee: SuggestedAttendee;
  isSelected: boolean;
  onToggle: () => void;
  getInitials: (name: string) => string;
  showManualBadge?: boolean;
}

const AttendeeRow: React.FC<AttendeeRowProps> = ({
  attendee,
  isSelected,
  onToggle,
  getInitials,
  showManualBadge = false
}) => {
  return (
    <label
      className={cn(
        'flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
        isSelected ? 'bg-primary/5' : 'hover:bg-muted'
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="shrink-0"
      />
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={attendee.avatar_url} alt={attendee.name} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {getInitials(attendee.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attendee.name}</p>
        <p className="text-xs text-muted-foreground truncate">{attendee.role}</p>
      </div>
      <Badge 
        variant="outline" 
        className={cn(
          'shrink-0 text-[10px] px-1.5',
          showManualBadge 
            ? 'border-purple-500/50 text-purple-600 bg-purple-50'
            : attendee.source === 'team'
              ? 'border-green-500/50 text-green-600 bg-green-50'
              : attendee.source === 'responsible' 
                ? 'border-blue-500/50 text-blue-600 bg-blue-50' 
                : 'border-amber-500/50 text-amber-600 bg-amber-50'
        )}
      >
        {showManualBadge 
          ? 'Added' 
          : attendee.source === 'team'
            ? 'Project Team'
            : attendee.source === 'responsible' 
              ? 'Responsible' 
              : 'Approver'}
      </Badge>
    </label>
  );
};
