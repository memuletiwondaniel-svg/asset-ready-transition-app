import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Plus, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { openInTeams } from '@/lib/outlook-protocol';
import { useProjectRoleHolders } from '@/hooks/useProjectRoleHolders';
import { useProfileUsers, ProfileUser } from '@/hooks/useProfileUsers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handoverPointId: string;
  projectId?: string;
  vcrCode?: string;
  vcrName?: string;
  projectPrefix?: string;
  taskId?: string;
  /** 'sof' (default) → reads vcr_sof_approvers seats and writes activity_type=sof_meeting.
   *  'pac' → reads vcr_pac_approvers seats and writes activity_type=pac_meeting. */
  variant?: 'sof' | 'pac';
}

interface AdHocAttendee {
  key: string;
  userId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  role: string;
}

const DURATIONS = [
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
];

const resolveAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

const initialsOf = (name: string) =>
  (name || '·').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

export const ScheduleSofMeetingModal: React.FC<Props> = ({
  open,
  onOpenChange,
  handoverPointId,
  projectId,
  vcrCode,
  vcrName,
  projectPrefix,
  taskId,
  variant = 'sof',
}) => {
  const { toast } = useToast();
  const label = `${vcrCode || 'VCR'}${vcrName ? ` (${vcrName})` : ''}`;
  const isPac = variant === 'pac';
  const meetingKind = isPac ? 'PAC' : 'SoF';
  const seatTable = isPac ? 'vcr_pac_approvers' : 'vcr_sof_approvers';
  const activityType = isPac ? 'pac_meeting' : 'sof_meeting';
  const scheduleAction = isPac ? 'schedule_pac_meeting' : 'schedule_sof_meeting';
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState<number>(60);
  const [body, setBody] = useState('');
  const [removedRoles, setRemovedRoles] = useState<Set<string>>(new Set());
  const [adHoc, setAdHoc] = useState<AdHocAttendee[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Load SoF approver seats for attendees
  const { data: seats = [] } = useQuery({
    queryKey: ['vcr-sof-approvers-seats', handoverPointId],
    enabled: open && !!handoverPointId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('vcr_sof_approvers')
        .select('id, approver_role, approver_level, user_id, approver_name')
        .eq('handover_point_id', handoverPointId)
        .order('approver_level', { ascending: true });
      return (data || []) as any[];
    },
  });

  const roleLabels = useMemo(() => Array.from(new Set(seats.map((s) => s.approver_role))).filter(Boolean), [seats]);
  const { data: holdersByRole = {} } = useProjectRoleHolders(projectId, roleLabels);
  const { data: profileUsers } = useProfileUsers();

  useEffect(() => {
    if (open) {
      setSubject(`SoF Meeting: ${projectPrefix ? projectPrefix + ' ' : ''}${label} Startup`);
      const dateStr = date ? format(date, 'PPP') : 'TBD';
      setBody(
        `Dear Colleagues,\n\nYou are invited to the Statement of Fitness (SoF) meeting for ${label}.\n\n` +
          `Context: All discipline assurance statements and the interdisciplinary summary have been recorded. ` +
          `We will review readiness for start-up and complete SoF sign-off.\n\n` +
          `Date: ${dateStr}\nDuration: ${duration} minutes\n\n` +
          `VCR overview: ${window.location.origin}/vcr/${handoverPointId}\n` +
          `SoF tab: ${window.location.origin}/vcr/${handoverPointId}?tab=sof\n\n` +
          `Best regards,\nORSH ORA Team`,
      );
      setRemovedRoles(new Set());
      setAdHoc([]);
      setSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const seatAttendees = useMemo(() => {
    return seats
      .filter((s) => !removedRoles.has(s.id))
      .map((s) => {
        const holders = holdersByRole[s.approver_role] || [];
        const holder = holders[0];
        return {
          seatId: s.id,
          role: s.approver_role,
          name: holder?.full_name || s.approver_name || 'Unassigned',
          avatar: resolveAvatarUrl(holder?.avatar_url) || null,
          userId: holder?.user_id || s.user_id,
          email: holder?.email || null,
          kind: 'seat' as const,
        };
      });
  }, [seats, holdersByRole, removedRoles]);

  const adHocAttendees = useMemo(
    () =>
      adHoc.map((a) => ({
        seatId: a.key,
        role: a.role,
        name: a.name,
        avatar: a.avatar,
        userId: a.userId,
        email: a.email,
        kind: 'adhoc' as const,
      })),
    [adHoc],
  );

  const attendees = useMemo(() => [...seatAttendees, ...adHocAttendees], [seatAttendees, adHocAttendees]);

  // pair into rows of two
  const rows: (typeof attendees)[] = [];
  for (let i = 0; i < attendees.length; i += 2) rows.push(attendees.slice(i, i + 2));

  const existingIds = useMemo(() => {
    const ids = new Set<string>();
    attendees.forEach((a) => a.userId && ids.add(a.userId));
    return ids;
  }, [attendees]);

  const filteredProfiles = useMemo(() => {
    if (!profileUsers) return [] as ProfileUser[];
    const s = search.toLowerCase();
    return profileUsers.filter((u) => {
      if (!s) return true;
      return (
        u.full_name?.toLowerCase().includes(s) ||
        u.position?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s)
      );
    });
  }, [profileUsers, search]);

  const addAdHoc = (u: ProfileUser) => {
    if (existingIds.has(u.user_id)) return;
    setAdHoc((prev) => [
      ...prev,
      {
        key: `adhoc-${u.user_id}-${Date.now()}`,
        userId: u.user_id,
        name: u.full_name,
        email: u.email || null,
        avatar: u.avatar_url || null,
        role: u.position || u.role || 'Attendee',
      },
    ]);
    setSearch('');
    setPickerOpen(false);
  };

  const removeAttendee = (a: (typeof attendees)[number]) => {
    if (a.kind === 'seat') setRemovedRoles((s) => new Set(s).add(a.seatId));
    else setAdHoc((prev) => prev.filter((x) => x.key !== a.seatId));
  };

  const buildStartEnd = () => {
    const [hh, mm] = startTime.split(':').map(Number);
    const start = new Date(date || new Date());
    start.setHours(hh || 10, mm || 0, 0, 0);
    const end = new Date(start.getTime() + duration * 60000);
    return { start, end };
  };

  const completeTask = async () => {
    if (!taskId) {
      await (supabase as any)
        .from('user_tasks')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('type', 'task')
        .filter('metadata->>action', 'eq', 'schedule_sof_meeting')
        .filter('metadata->>handover_point_id', 'eq', handoverPointId)
        .neq('status', 'completed');
    } else {
      await (supabase as any)
        .from('user_tasks')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', taskId);
    }
  };

  const persistMeeting = async (outlookEventId?: string) => {
    const { start, end } = buildStartEnd();
    const { data: userData } = await supabase.auth.getUser();
    await (supabase as any).from('vcr_key_activities').insert({
      handover_point_id: handoverPointId,
      activity_type: 'sof_meeting',
      label: subject,
      status: 'scheduled',
      scheduled_date: start.toISOString(),
      scheduled_end_date: end.toISOString(),
      notes: body,
      attendees: attendees.map((a) => ({
        role: a.role,
        name: a.name,
        user_id: a.userId,
        email: a.email,
        kind: a.kind,
      })),
      outlook_event_id: outlookEventId || null,
      scheduled_by: userData?.user?.id || null,
      task_id: taskId || null,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await persistMeeting();
      await completeTask();
      toast({ title: 'Scheduled', description: 'SoF meeting saved.' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to save meeting', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTeams = async () => {
    const { start, end } = buildStartEnd();
    // Teams deep link needs real emails; skip attendees without resolvable email.
    const deepLinkAttendees = attendees
      .filter((a) => a.email && a.email.includes('@'))
      .map((a) => ({ name: a.name, email: a.email as string }));
    openInTeams({
      title: subject,
      description: body,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      attendees: deepLinkAttendees,
    });
    try {
      await persistMeeting();
      await completeTask();
    } catch {
      /* non-blocking */
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="sr-only">Schedule SoF Meeting</DialogTitle>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <h2 className="text-lg font-semibold text-foreground mt-0.5">Schedule SoF Meeting</h2>
        </div>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-medium text-foreground">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Required attendees</label>
            <div className="mt-1 rounded-md border border-border divide-y">
              {rows.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground italic">No SoF approver seats defined for this VCR.</p>
              )}
              {rows.map((pair, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 divide-x">
                  {pair.map((a) => (
                    <div key={a.seatId} className="group flex items-center gap-2 p-2.5 relative">
                      <Avatar className="h-8 w-8">
                        {a.avatar && <AvatarImage src={a.avatar} />}
                        <AvatarFallback className="text-[10px]">{initialsOf(a.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-xs font-medium truncate', a.name === 'Unassigned' && 'text-muted-foreground italic')}>
                          {a.name}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground truncate">
                          {a.role}
                          {!a.email && <span className="ml-1 italic">(no email)</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => removeAttendee(a)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1"
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add attendee
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, role, or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                        autoFocus
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-64">
                    {filteredProfiles.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        {search ? 'No users found' : 'Type to search…'}
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filteredProfiles.slice(0, 50).map((u) => {
                          const already = existingIds.has(u.user_id);
                          return (
                            <button
                              key={u.user_id}
                              disabled={already}
                              onClick={() => addAdHoc(u)}
                              className={cn(
                                'w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors',
                                already ? 'opacity-50 cursor-default' : 'hover:bg-muted',
                              )}
                            >
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarImage src={u.avatar_url} alt={u.full_name} />
                                <AvatarFallback className="text-[10px]">{initialsOf(u.full_name)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{u.full_name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {u.position || u.role || u.email || '—'}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('mt-1 w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Start</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Duration</label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Invitation body</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 min-h-[140px] text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleTeams} disabled={saving}>Open in Teams</Button>
            <Button onClick={handleSave} disabled={saving}>Save schedule</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
