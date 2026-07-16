import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Paperclip, Upload, X, Video, CalendarIcon, Clock, Plus, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  typeLabel,
  type WHPoint,
} from '@/components/p2a-workspace/handover-points/vcr-standard/deliverables/useWHPoints';

/**
 * FE-2: Schedule modal for a W&H point (NOT_STARTED → SCHEDULED).
 */

export interface ScheduleWitnessHoldModalProps {
  point: WHPoint;
  vcrCode: string;
  vcrName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onScheduled?: () => void;
}

const initials = (n: string) =>
  n.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

interface Invitee {
  id: string;
  user_id?: string | null;
  full_name: string;
  role_name?: string | null;
  avatar_url?: string | null;
}

export const ScheduleWitnessHoldModal: React.FC<ScheduleWitnessHoldModalProps> = ({
  point, vcrCode, vcrName, open, onOpenChange, onScheduled,
}) => {
  const qc = useQueryClient();

  const [date, setDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);

  // Pre-populate on open
  useEffect(() => {
    if (!open) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow);
    setStartTime('09:00');
    setEndTime('11:00');
    setLocation(point.location || '');
    setMessage(
      `Dear all — please join the ${typeLabel(point.inspection_type).toLowerCase()} for "${point.activity_name}" on VCR ${vcrCode}${vcrName ? ` (${vcrName})` : ''}. Kindly review the linked point and prepare any evidence required to accept the outcome.`,
    );
    setAttachments([]);
    setInvitees(
      point.accepting_parties
        .filter((p) => p.user_full_name)
        .map((p) => ({
          id: p.id,
          user_id: p.user_id,
          full_name: p.user_full_name || '',
          role_name: p.role_name,
          avatar_url: p.user_avatar_url,
        })),
    );
  }, [open, point, vcrCode, vcrName]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const vcrUrl = `${origin}/#/vcr/${vcrCode}`;
  const pointUrl = `${vcrUrl}?wh=${point.id}`;

  const scheduling = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error('Date is required');
      const [h, m] = startTime.split(':').map(Number);
      const start = new Date(date);
      start.setHours(h || 0, m || 0, 0, 0);
      const scheduledAt = start.toISOString();

      const composedNote =
        `${message.trim()}\n\n` +
        `When: ${format(start, 'EEE, dd MMM yyyy')} · ${startTime}–${endTime}\n` +
        (location.trim() ? `Where: ${location.trim()}\n` : '') +
        `VCR:   ${vcrUrl}\n` +
        `Point: ${pointUrl}`;

      const c = supabase as any;
      const upd = await c
        .from('p2a_itp_activities')
        .update({
          status: 'SCHEDULED',
          scheduled_at: scheduledAt,
          location: location.trim() || null,
        })
        .eq('id', point.id);
      if (upd.error) throw upd.error;
      const { data: u } = await c.auth.getUser();
      await c.from('p2a_itp_activity_log').insert({
        itp_activity_id: point.id,
        user_id: u.user?.id ?? null,
        action: 'scheduled',
        comment: composedNote.trim() || null,
      });
      for (const f of attachments) {
        const path = `wh/${point.id}/${crypto.randomUUID()}-${f.name}`;
        const up = await c.storage.from('p2a-attachments').upload(path, f);
        if (!up.error) {
          await c.from('p2a_itp_attachments').insert({
            itp_activity_id: point.id,
            kind: 'invite',
            file_path: path,
            file_name: f.name,
            uploaded_by: u.user?.id ?? null,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success('Activity scheduled');
      qc.invalidateQueries({ queryKey: ['wh-points', point.handover_point_id] });
      onScheduled?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to schedule'),
  });

  const onFiles = (fs: FileList | null) => {
    if (!fs) return;
    setAttachments((prev) => [...prev, ...Array.from(fs)]);
  };

  const removeInvitee = (id: string) =>
    setInvitees((prev) => prev.filter((i) => i.id !== id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px] p-0 gap-0 !z-[1600]"
        overlayClassName="bg-black/80 backdrop-blur-sm !z-[1600]"
      >
        <DialogHeader className="px-6 pt-5 pb-3 space-y-1 text-left">
          <DialogTitle className="text-[16px] leading-tight font-bold tracking-tight">
            Schedule W&amp;H Activity
          </DialogTitle>
          <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground/70">
            {vcrCode}{vcrName ? ` · ${vcrName}` : ''} · {typeLabel(point.inspection_type)}
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto border-t">
          {/* Date & time */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted-foreground/80">
              Date &amp; time
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 gap-2 font-normal text-sm justify-start min-w-[160px]"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    {date ? format(date, 'dd MMM yyyy') : <span className="text-muted-foreground">Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[1700]" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => { setDate(d); setDatePopoverOpen(false); }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <div className="h-9 flex items-center gap-1.5 rounded-md border border-input px-3 text-sm">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-transparent outline-none w-[70px] text-sm"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-transparent outline-none w-[70px] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Location — own row */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted-foreground/80">
              Location
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Compressor House A / MS Teams"
                className="h-9 text-sm pl-8"
              />
            </div>
          </div>

          {/* Invitees */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted-foreground/80">
                Invitees
              </label>
              <button
                type="button"
                onClick={() => toast.info('Attendee picker coming with the roster integration turn.')}
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline"
              >
                <Plus className="w-3 h-3" /> Add attendee
              </button>
            </div>
            {invitees.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/70">
                No invitees. Use "Add attendee" to invite someone.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {invitees.map((inv) => (
                  <div
                    key={inv.id}
                    className="group relative flex items-center gap-2 min-w-0 rounded-md py-1 pr-6 -mr-2 hover:bg-muted/40 transition-colors"
                  >
                    <Avatar className="h-7 w-7">
                      {inv.avatar_url && <AvatarImage src={inv.avatar_url} />}
                      <AvatarFallback className="text-[10px]">
                        {initials(inv.full_name || '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium truncate">{inv.full_name}</div>
                      {inv.role_name && (
                        <div className="text-[10.5px] text-muted-foreground truncate">{inv.role_name}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeInvitee(inv.id)}
                      aria-label={`Remove ${inv.full_name}`}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10.5px] text-muted-foreground/60">
              Defaults to the accepting parties · hover to remove
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted-foreground/80">
              Notes
            </label>
            <div className="rounded-md border border-input bg-background overflow-hidden">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-[12.5px] min-h-[96px] border-0 rounded-none focus-visible:ring-0 resize-none"
                placeholder="Add a short message for the invitees…"
              />
              <div className="border-t bg-muted/30 px-3 py-2.5 space-y-1 text-[11.5px]">
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-14 shrink-0">Activity</span>
                  <span className="text-foreground truncate">{point.activity_name}</span>
                </div>
                {point.system && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-14 shrink-0">System</span>
                    <span className="text-foreground truncate">
                      {point.system.system_id} · {point.system.name}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-14 shrink-0">Links</span>
                  <span className="flex flex-wrap gap-x-3">
                    <a
                      href={vcrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      View {vcrCode}
                    </a>
                    <a
                      href={pointUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      W&amp;H activity details
                    </a>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted-foreground/80">
              Attachments
            </label>
            <label className="flex items-center gap-2 rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-muted/40">
              <Upload className="w-3.5 h-3.5" />
              Drop files or click to attach
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate flex-1">{f.name}</span>
                    <button
                      onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.info('Teams meeting deep-link generation lands with the calendar integration turn.')
              }
              className="gap-1.5"
            >
              <Video className="w-3.5 h-3.5" /> Open in Teams
            </Button>
            <Button
              size="sm"
              disabled={scheduling.isPending || !date}
              onClick={() => scheduling.mutate()}
            >
              {scheduling.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Send invite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
