import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useRaiseQualification } from '@/hooks/useQualificationDetail';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface PrereqOption {
  id: string;
  code: string;
  summary: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  handoverPointId: string;
  vcrCode?: string;
  vcrName?: string;
  /** When provided, item is pre-selected & locked (VCR item-drawer launcher). */
  lockedPrerequisiteId?: string;
  prereqs: PrereqOption[];
}

export const RaiseQualificationModal: React.FC<Props> = ({
  open, onOpenChange, handoverPointId, vcrCode, vcrName, lockedPrerequisiteId, prereqs,
}) => {
  const [prereqId, setPrereqId] = useState<string>(lockedPrerequisiteId || prereqs[0]?.id || '');
  const [reason, setReason] = useState('');
  const [mitigation, setMitigation] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [approverIds, setApproverIds] = useState<string[]>([]);
  const { data: profiles } = useProfileUsers();
  const { raise } = useRaiseQualification();

  useEffect(() => {
    if (open) {
      setPrereqId(lockedPrerequisiteId || prereqs[0]?.id || '');
      setReason(''); setMitigation(''); setFollowUp('');
      setTargetDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
      setApproverIds([]);
    }
  }, [open, lockedPrerequisiteId, prereqs]);

  // Default approvers = the item's approvers (from vcr_prerequisite_approvals).
  const { data: defaultApprovers } = useQuery({
    queryKey: ['prereq-approvers-default', prereqId],
    enabled: !!prereqId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('vcr_prerequisite_approvals')
        .select('user_id')
        .eq('vcr_prerequisite_id', prereqId);
      return Array.from(new Set((data || []).map((r: any) => r.user_id as string)));
    },
  });

  useEffect(() => {
    if (defaultApprovers && approverIds.length === 0) {
      setApproverIds(defaultApprovers as string[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultApprovers]);

  const canSubmit =
    !!prereqId && reason.trim().length > 5 && mitigation.trim().length > 5 &&
    !!targetDate && approverIds.length > 0;

  const submit = (draft: boolean) => {
    raise.mutate({
      vcr_prerequisite_id: prereqId,
      handover_point_id: handoverPointId,
      vcr_code: vcrCode,
      vcr_name: vcrName,
      reason: reason.trim(),
      mitigation: mitigation.trim(),
      follow_up_action: followUp.trim() || undefined,
      target_date: targetDate,
      approver_user_ids: approverIds,
      draft,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const toggleApprover = (uid: string) => {
    setApproverIds(a => a.includes(uid) ? a.filter(x => x !== uid) : [...a, uid]);
  };

  const teamMembers = (profiles || []).slice(0, 20); // pool

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Raise Qualification — {vcrCode || 'VCR'}{vcrName ? ` (${vcrName})` : ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Item <span className="text-red-600">*</span></Label>
            <Select value={prereqId} onValueChange={setPrereqId} disabled={!!lockedPrerequisiteId}>
              <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
              <SelectContent>
                {prereqs.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-[11px] mr-2">{p.code}</span>
                    <span className="text-xs">{p.summary.slice(0, 70)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Reason <span className="text-red-600">*</span></Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} className="min-h-[70px]" />
          </div>

          <div className="space-y-1.5">
            <Label>Mitigation <span className="text-red-600">*</span></Label>
            <Textarea value={mitigation} onChange={e => setMitigation(e.target.value)} className="min-h-[70px]" />
          </div>

          <div className="space-y-1.5">
            <Label>Follow-up action</Label>
            <Textarea value={followUp} onChange={e => setFollowUp(e.target.value)} className="min-h-[50px]" />
          </div>

          <div className="space-y-1.5">
            <Label>Target close-out <span className="text-red-600">*</span></Label>
            <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Approvers <span className="text-red-600">*</span></Label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto border rounded p-2">
              {teamMembers.map((p: any) => (
                <label key={p.user_id} className={cn(
                  'flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted/40',
                  approverIds.includes(p.user_id) && 'bg-primary/5 border border-primary/30',
                )}>
                  <Checkbox checked={approverIds.includes(p.user_id)} onCheckedChange={() => toggleApprover(p.user_id)} />
                  <Avatar className="h-6 w-6">
                    {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                    <AvatarFallback className="text-[9px]">
                      {(p.full_name || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{p.full_name}</div>
                    {p.role && <div className="text-[10px] text-muted-foreground truncate">{p.role}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={() => submit(true)} disabled={raise.isPending}>Save as draft</Button>
          <Button onClick={() => submit(false)} disabled={!canSubmit || raise.isPending}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
