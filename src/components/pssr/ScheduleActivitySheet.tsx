import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarIcon, MapPin, Clock, Send, CheckCircle2, Loader2, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PSSRKeyActivity } from '@/hooks/usePSSRKeyActivities';
import { InvitationPreview } from './walkdown/InvitationPreview';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Invitee {
  name: string;
  position: string | null;
  avatarUrl: string | null;
  group: 'PSSR Lead' | 'Delivering Party' | 'Approving Party' | 'SoF Approver';
}

interface ScheduleActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: PSSRKeyActivity | null;
  pssrId?: string;
  pssrTitle?: string;
  onSchedule: (data: {
    activityId: string;
    scheduledDate: string;
    scheduledEndDate?: string;
    location?: string;
    notes?: string;
  }) => Promise<void>;
}

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export const ScheduleActivitySheet: React.FC<ScheduleActivitySheetProps> = ({
  open,
  onOpenChange,
  activity,
  pssrId,
  pssrTitle,
  onSchedule,
}) => {
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [customMessage, setCustomMessage] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ schedule: true, preview: true, invites: true });

  const isScheduled = activity?.status === 'scheduled' || activity?.status === 'completed';
  const isSofMeeting = activity?.activity_type === 'sof_meeting';

  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Fetch PSSR details for lead info
  const { data: pssrDetails } = useQuery({
    queryKey: ['pssr-schedule-details', pssrId],
    queryFn: async () => {
      if (!pssrId) return null;
      const { data, error } = await supabase
        .from('pssrs')
        .select('title, scope, plant_id, pssr_lead_id')
        .eq('id', pssrId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!pssrId && open,
  });

  // Fetch lead profile
  const { data: leadProfile } = useQuery({
    queryKey: ['pssr-lead-profile', pssrDetails?.pssr_lead_id],
    queryFn: async () => {
      if (!pssrDetails?.pssr_lead_id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, position')
        .eq('user_id', pssrDetails.pssr_lead_id)
        .single();
      if (data?.avatar_url && !data.avatar_url.startsWith('http')) {
        data.avatar_url = supabase.storage.from('user-avatars').getPublicUrl(data.avatar_url).data.publicUrl;
      }
      return data;
    },
    enabled: !!pssrDetails?.pssr_lead_id && open,
  });

  // Fetch delivering/approving roles
  const { data: partyRoles } = useQuery({
    queryKey: ['pssr-schedule-parties', pssrId],
    queryFn: async () => {
      if (!pssrId) return { delivering: [] as string[], approving: [] as string[] };
      const { data: responses } = await supabase
        .from('pssr_checklist_responses')
        .select('delivering_role, approving_role')
        .eq('pssr_id', pssrId);
      const delSet = new Set<string>();
      const appSet = new Set<string>();
      (responses || []).forEach(r => {
        if (r.delivering_role) delSet.add(r.delivering_role);
        if (r.approving_role) {
          r.approving_role.split(',').map(s => s.trim()).filter(Boolean).forEach(role => appSet.add(role));
        }
      });
      return { delivering: Array.from(delSet), approving: Array.from(appSet) };
    },
    enabled: !!pssrId && open && !isSofMeeting,
  });

  // Resolve role names to profiles
  const allRoleNames = useMemo(() => {
    if (!partyRoles) return [];
    return [...new Set([...partyRoles.delivering, ...partyRoles.approving])];
  }, [partyRoles]);

  const { data: roleProfileMap } = useQuery({
    queryKey: ['pssr-schedule-role-profiles', pssrId, allRoleNames],
    queryFn: async () => {
      if (allRoleNames.length === 0) return {};
      let plantName = '';
      if (pssrDetails?.plant_id) {
        const { data: plantData } = await supabase.from('plant').select('name').eq('id', pssrDetails.plant_id).single();
        plantName = plantData?.name || '';
      }
      const map: Record<string, { full_name: string; avatar_url: string | null; position: string | null }> = {};
      for (const role of allRoleNames) {
        let found = null;
        if (plantName) {
          const { data } = await supabase.from('profiles').select('user_id, full_name, avatar_url, position').eq('is_active', true).ilike('position', `%${role}%`).ilike('position', `%${plantName}%`).not('position', 'ilike', '%Project%').limit(1);
          if (data?.length) found = data[0];
        }
        if (!found) {
          const { data } = await supabase.from('profiles').select('user_id, full_name, avatar_url, position').eq('is_active', true).ilike('position', `%${role}%`).not('position', 'ilike', '%Project%').limit(5);
          if (data?.length) found = data.find(p => p.position?.includes('Asset')) || data[0];
        }
        if (found) {
          let avatarUrl = found.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) avatarUrl = supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
          map[role] = { full_name: found.full_name || role, avatar_url: avatarUrl, position: found.position };
        }
      }
      return map;
    },
    enabled: allRoleNames.length > 0 && open,
  });

  // Fetch SoF approvers
  const { data: sofApprovers } = useQuery({
    queryKey: ['pssr-schedule-sof', pssrId],
    queryFn: async () => {
      if (!pssrId) return [];
      const { data } = await supabase.from('sof_approvers').select('*').eq('pssr_id', pssrId);
      return data || [];
    },
    enabled: !!pssrId && open && isSofMeeting,
  });

  // Fetch SoF approver profiles
  const sofUserIds = useMemo(() => (sofApprovers || []).filter((a: any) => a.user_id).map((a: any) => a.user_id as string), [sofApprovers]);
  const { data: sofProfiles } = useQuery({
    queryKey: ['pssr-schedule-sof-profiles', sofUserIds],
    queryFn: async () => {
      if (sofUserIds.length === 0) return {};
      const { data } = await supabase.from('profiles').select('user_id, full_name, avatar_url, position').in('user_id', sofUserIds);
      const map: Record<string, { full_name: string; avatar_url: string | null; position: string | null }> = {};
      data?.forEach(p => {
        let av = p.avatar_url;
        if (av && !av.startsWith('http')) av = supabase.storage.from('user-avatars').getPublicUrl(av).data.publicUrl;
        map[p.user_id] = { full_name: p.full_name || '', avatar_url: av, position: p.position };
      });
      return map;
    },
    enabled: sofUserIds.length > 0 && open,
  });

  // Build invite list
  const invitees = useMemo<Invitee[]>(() => {
    const list: Invitee[] = [];
    // PSSR Lead always included
    if (leadProfile) {
      list.push({ name: leadProfile.full_name || 'PSSR Lead', position: leadProfile.position, avatarUrl: leadProfile.avatar_url, group: 'PSSR Lead' });
    }

    if (isSofMeeting) {
      // SoF approvers
      (sofApprovers || []).forEach((a: any) => {
        const prof = sofProfiles?.[a.user_id];
        list.push({
          name: prof?.full_name || a.approver_name || a.approver_role,
          position: prof?.position || a.approver_role,
          avatarUrl: prof?.avatar_url || null,
          group: 'SoF Approver',
        });
      });
    } else {
      // Delivering parties
      (partyRoles?.delivering || []).forEach(role => {
        const resolved = roleProfileMap?.[role];
        list.push({
          name: resolved?.full_name || role,
          position: resolved?.position || role,
          avatarUrl: resolved?.avatar_url || null,
          group: 'Delivering Party',
        });
      });
      // Approving parties
      (partyRoles?.approving || []).forEach(role => {
        const resolved = roleProfileMap?.[role];
        list.push({
          name: resolved?.full_name || role,
          position: resolved?.position || role,
          avatarUrl: resolved?.avatar_url || null,
          group: 'Approving Party',
        });
      });
    }
    return list;
  }, [leadProfile, isSofMeeting, sofApprovers, sofProfiles, partyRoles, roleProfileMap]);

  // Group invitees
  const groupedInvitees = useMemo(() => {
    const groups: Record<string, Invitee[]> = {};
    invitees.forEach(inv => {
      if (!groups[inv.group]) groups[inv.group] = [];
      groups[inv.group].push(inv);
    });
    return groups;
  }, [invitees]);

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
        notes: customMessage || '',
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
    setCustomMessage(undefined);
  };

  if (!activity) return null;

  const subject = `${activity.label} – ${pssrTitle || pssrDetails?.title || 'PSSR'}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {isScheduled ? activity.label : `Schedule ${activity.label}`}
          </SheetTitle>
          <SheetDescription>
            {pssrTitle && <span className="text-xs">{pssrTitle}</span>}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {isScheduled ? (
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
            <>
              {/* Section A: Schedule Details */}
              <Collapsible open={openSections['schedule']} onOpenChange={() => toggleSection('schedule')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Schedule Details</span>
                  </div>
                  {openSections['schedule'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3 px-1">
                  <div>
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start text-left font-normal mt-1', !date && 'text-muted-foreground')}
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
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Section B: Invitation Preview */}
              <Collapsible open={openSections['preview']} onOpenChange={() => toggleSection('preview')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Invitation Preview</span>
                  </div>
                  {openSections['preview'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 px-1">
                  <InvitationPreview
                    subject={subject}
                    scope={pssrDetails?.scope || ''}
                    date={date}
                    time={time}
                    location={location}
                    pssrLink={`${window.location.origin}/pssr/${pssrId}`}
                    customMessage={customMessage}
                    onCustomMessageChange={setCustomMessage}
                    senderName={leadProfile?.full_name}
                    senderPosition={leadProfile?.position || undefined}
                  />
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Section C: Invite List */}
              <Collapsible open={openSections['invites']} onOpenChange={() => toggleSection('invites')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Invite List</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] h-5">{invitees.length}</Badge>
                    {openSections['invites'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 px-1 space-y-3">
                  {Object.entries(groupedInvitees).map(([group, members]) => (
                    <div key={group}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{group}s</p>
                      <div className="space-y-1">
                        {members.map((inv, idx) => (
                          <div key={`${inv.name}-${idx}`} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                            <Avatar className="h-7 w-7">
                              {inv.avatarUrl && <AvatarImage src={inv.avatarUrl} />}
                              <AvatarFallback className="text-[10px]">{getInitials(inv.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{inv.name}</p>
                              {inv.position && <p className="text-[10px] text-muted-foreground truncate">{inv.position}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {invitees.length === 0 && (
                    <p className="text-xs text-muted-foreground">No invitees resolved yet</p>
                  )}
                </CollapsibleContent>
              </Collapsible>

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
