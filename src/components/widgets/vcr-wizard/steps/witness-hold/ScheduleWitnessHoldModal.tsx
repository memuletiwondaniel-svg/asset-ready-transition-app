import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Paperclip, Upload, X, Video } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WHPoint } from '@/components/p2a-workspace/handover-points/vcr-standard/deliverables/useWHPoints';

/**
 * FE-2: Schedule modal for a W&H point (NOT_STARTED → SCHEDULED).
 * Fields per mockup:
 *   - Title with point-name subtext + type chip
 *   - Date & time (single field, produces scheduled_at)
 *   - Location
 *   - Invitees: 2-col avatar rows (defaults to accepting parties), no dividers
 *   - Notes: PRE-POPULATED with generated text + hyperlinks to VCR + W&H point
 *   - Attachments
 *   - Cancel / Open in Teams / Send invite
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

export const ScheduleWitnessHoldModal: React.FC<ScheduleWitnessHoldModalProps> = ({
  point, vcrCode, vcrName, open, onOpenChange, onScheduled,
}) => {
  const qc = useQueryClient();
  const isHold = point.inspection_type === 'HOLD';

  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const invitees = useMemo(
    () => point.accepting_parties.filter((p) => p.user_full_name),
    [point.accepting_parties],
  );

  // Pre-populate on open
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    now.setDate(now.getDate() + 1);
    now.setHours(9, 0, 0, 0);
    setDateTime(format(now, "yyyy-MM-dd'T'HH:mm"));
    setLocation(point.location || '');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const vcrUrl  = `${origin}/#/vcr/${vcrCode}`;
    const pointUrl = `${vcrUrl}?wh=${point.id}`;
    setNotes(
      [
        `You are invited to witness the following point on VCR ${vcrCode}${vcrName ? ` — ${vcrName}` : ''}.`,
        '',
        `Activity: ${point.activity_name}`,
        point.system ? `System:   ${point.system.system_id} · ${point.system.name}` : '',
        `Type:     ${isHold ? 'Hold' : 'Witness'} point`,
        '',
        `VCR:   ${vcrUrl}`,
        `Point: ${pointUrl}`,
        '',
        'Please review the linked point and prepare any evidence required to accept the outcome.',
      ].filter(Boolean).join('\n'),
    );
    setAttachments([]);
  }, [open, point, vcrCode, vcrName, isHold]);

  const scheduling = useMutation({
    mutationFn: async () => {
      if (!dateTime) throw new Error('Date & time is required');
      const c = supabase as any;
      const scheduledAt = new Date(dateTime).toISOString();
      // 1. Update WH row
      const upd = await c
        .from('p2a_itp_activities')
        .update({
          status: 'SCHEDULED',
          scheduled_at: scheduledAt,
          location: location.trim() || null,
        })
        .eq('id', point.id);
      if (upd.error) throw upd.error;
      // 2. Insert log entry (invite notes)
      const { data: u } = await c.auth.getUser();
      await c.from('p2a_itp_activity_log').insert({
        itp_activity_id: point.id,
        user_id: u.user?.id ?? null,
        action: 'scheduled',
        comment: notes.trim() || null,
      });
      // 3. Upload attachments (best effort)
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
      toast.success('Point scheduled');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 !z-[1600]" overlayClassName="bg-black/80 backdrop-blur-sm !z-[1600]">
        <DialogHeader className="px-6 pt-5 pb-3 space-y-1">
          <DialogTitle className="text-base font-medium flex items-center gap-2">
            Schedule witness &amp; hold point
            <span className={cn(
              'text-[10.5px] font-bold rounded-full border px-2 py-0.5',
              isHold ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200',
            )}>
              {isHold ? 'Hold' : 'Witness'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {point.activity_name}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Date &amp; time</label>
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Compressor House A"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Invitees</label>
            {invitees.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/70">
                No accepting parties resolved yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {invitees.map((ap) => (
                  <div key={ap.id} className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-7 w-7">
                      {ap.user_avatar_url && <AvatarImage src={ap.user_avatar_url} />}
                      <AvatarFallback className="text-[10px]">
                        {initials(ap.user_full_name || '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium truncate">{ap.user_full_name}</div>
                      {ap.role_name && (
                        <div className="text-[10.5px] text-muted-foreground truncate">{ap.role_name}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-[12.5px] min-h-[160px] font-mono leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Attachments</label>
            <label className="flex items-center gap-2 rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-muted/40">
              <Upload className="w-3.5 h-3.5" />
              Attach files
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

        <div className="px-6 py-3 border-t flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
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
            disabled={scheduling.isPending || !dateTime}
            onClick={() => scheduling.mutate()}
          >
            {scheduling.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            Send invite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
