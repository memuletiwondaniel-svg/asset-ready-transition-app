import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApproverRow {
  id: string;
  user_id: string | null;
  role_name: string;
  status: string | null;
  approved_at: string | null;
  comments: string | null;
  display_order: number | null;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  avatar_url?: string | null;
}

const resolveAvatarUrl = (avatarUrl?: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';

const statusChip = (s: string | null) => {
  if (s === 'APPROVED')
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Approved</Badge>;
  if (s === 'REJECTED')
    return <Badge className="bg-red-500/10 text-red-600 border-0">Changes requested</Badge>;
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Pending
    </Badge>
  );
};

const ApproverDecisionCard: React.FC<{ row: ApproverRow; profile?: ProfileRow | null }> = ({
  row,
  profile,
}) => {
  const [open, setOpen] = useState(false);
  const hasComment = !!row.comments;
  const name = row.user_id ? (profile?.full_name || 'User') : 'Unassigned';
  const initialsSource = row.user_id ? name : row.role_name;

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => row.approved_at && setOpen((o) => !o)}
        disabled={!row.approved_at}
        aria-expanded={!!row.approved_at && open}
        data-rm-safe
        data-rm-nav
        className={cn(
          'w-full px-3 py-3 text-left flex items-center gap-3',
          row.approved_at ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-default',
        )}
      >
        {row.approved_at ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={resolveAvatarUrl(profile?.avatar_url)} />
          <AvatarFallback className="text-[10px] bg-muted">{getInitials(initialsSource)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate">{name}</span>
            <span className="text-[10px] font-mono text-muted-foreground">· {row.role_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusChip(row.status)}
          {row.approved_at && (
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(row.approved_at), 'd MMM, HH:mm')}
            </span>
          )}
        </div>
      </button>
      {open && row.approved_at && !hasComment && (
        <div className="px-12 pb-3 -mt-1 text-[12px] text-muted-foreground/70 italic">
          No comment left.
        </div>
      )}
      {open && hasComment && (
        <div
          className={cn(
            'px-12 pb-3 -mt-1 text-[12px] text-muted-foreground border-l-2 italic',
            row.status === 'APPROVED' ? 'border-emerald-500/40' : 'border-red-500/40',
          )}
        >
          "{row.comments}"
        </div>
      )}
    </div>
  );
};

export const P2AApproverStatusBoard: React.FC<{ handoverId: string; planStatus?: string }> = ({
  handoverId,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['p2a-approver-status', handoverId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('p2a_handover_approvers')
        .select('id, user_id, role_name, status, approved_at, comments, display_order')
        .eq('handover_id', handoverId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      const approvers = (rows || []) as ApproverRow[];
      const userIds = approvers.map((a) => a.user_id).filter(Boolean) as string[];
      let profileMap = new Map<string, ProfileRow>();
      if (userIds.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        if (pErr) throw pErr;
        (profs || []).forEach((p: ProfileRow) => profileMap.set(p.user_id, p));
      }
      return { approvers, profileMap };
    },
  });

  const approvers = data?.approvers || [];
  const total = approvers.length;
  const approved = approvers.filter((a) => a.status === 'APPROVED').length;
  const rejected = approvers.filter((a) => a.status === 'REJECTED').length;

  let summary = '';
  let summaryDestructive = false;
  if (total > 0) {
    if (rejected > 0) {
      summary = `${rejected} requested changes · ${approved} of ${total} approved`;
      summaryDestructive = true;
    } else if (approved === total) {
      summary = `All ${total} approvers approved`;
    } else {
      summary = `${approved} of ${total} approved · awaiting ${total - approved}`;
    }
  }

  return (
    <div className="space-y-3 p-4">
      <div>
        <h3 className="text-sm font-medium">Approver status</h3>
        {summary && (
          <p className={cn('text-xs', summaryDestructive ? 'text-red-600' : 'text-muted-foreground')}>
            {summary}
          </p>
        )}
      </div>
      <div className="rounded-lg border bg-card/30">
        {isLoading && (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {!isLoading && approvers.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground">No approvers assigned.</div>
        )}
        {approvers.map((row) => (
          <ApproverDecisionCard
            key={row.id}
            row={row}
            profile={row.user_id ? data?.profileMap.get(row.user_id) ?? null : null}
          />
        ))}
      </div>
    </div>
  );
};
