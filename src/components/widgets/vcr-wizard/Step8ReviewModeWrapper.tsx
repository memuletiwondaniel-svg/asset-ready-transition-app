import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApproversStep, type VCRApprover } from './steps/ApproversStep';
import { useVCRWizardSubMode } from './wizardModeContext';

interface ApproverRow {
  id: string;
  role_label: string;
  status: string | null;
  decided_at: string | null;
  approver_order: number | null;
  user_id: string | null;
  comments: string | null;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

const useRoster = (handoverPointId: string) =>
  useQuery({
    queryKey: ['vcr-plan-approver-roster-extended', handoverPointId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vcr_plan_approvers')
        .select('id, role_label, status, decided_at, approver_order, user_id, comments')
        .eq('handover_point_id', handoverPointId)
        .order('approver_order', { ascending: true });
      if (error) throw error;
      return (data || []) as ApproverRow[];
    },
    refetchOnMount: 'always',
  });

const useProfileMap = (userIds: string[]) =>
  useQuery({
    queryKey: ['vcr-approver-profiles', [...userIds].sort().join(',')],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, first_name, last_name, email, avatar_url')
        .in('user_id', userIds);
      if (error) throw error;
      const m = new Map<string, ProfileRow>();
      (data || []).forEach((p: ProfileRow) => m.set(p.user_id, p));
      return m;
    },
  });

const resolveAvatarUrl = (avatarUrl?: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

const resolveName = (p?: ProfileRow | null): string => {
  if (!p) return 'Unassigned';
  return (
    p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ') ||
    p.email ||
    'User'
  );
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

/** Single per-approver card: identity + decision chip + expandable comment. */
const ApproverDecisionCard: React.FC<{
  row: ApproverRow;
  profile?: ProfileRow | null;
}> = ({ row, profile }) => {
  const [open, setOpen] = useState(false);
  const hasComment = !!row.comments;
  const name = resolveName(profile);

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => row.decided_at && setOpen((o) => !o)}
        disabled={!row.decided_at}
        aria-expanded={!!row.decided_at && open}
        data-rm-safe
        data-rm-nav
        className={cn(
          'w-full px-3 py-3 text-left flex items-center gap-3',
          row.decided_at ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-default',
        )}
      >
        {row.decided_at ? (
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
          <AvatarFallback className="text-[10px] bg-muted">{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate">{name}</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              · {row.role_label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusChip(row.status)}
          {row.decided_at && (
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(row.decided_at), 'd MMM, HH:mm')}
            </span>
          )}
        </div>
      </button>
      {open && row.decided_at && !hasComment && (
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

const ApproverDecisionList: React.FC<{ handoverPointId: string; title: string; subtitle?: string }> = ({
  handoverPointId,
  title,
  subtitle,
}) => {
  const { data: roster, isLoading } = useRoster(handoverPointId);
  const userIds = (roster || []).map((r) => r.user_id).filter(Boolean) as string[];
  const { data: profileMap } = useProfileMap(userIds);

  return (
    <div className="space-y-3 p-4">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="rounded-lg border bg-card/30">
        {isLoading && (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {!isLoading && (roster || []).length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            No approvers configured.
          </div>
        )}
        {(roster || []).map((r) => (
          <ApproverDecisionCard
            key={r.id}
            row={r}
            profile={r.user_id ? profileMap?.get(r.user_id) ?? null : null}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Renders Step 8 (Approvers) with mode-aware content:
 *  - create / no subMode  → editable ApproversStep
 *  - ora_edit             → editable ApproversStep (decisions inline-aware via roster list below for any peer pending state)
 *  - review_only          → unified per-approver decision list (no editor)
 *
 * In both review modes the decision state lives on the approver card itself
 * (status chip + decided_at, expandable to reveal that approver's comment).
 * There is no separate "Decisions so far" section anymore.
 */
export const Step8ReviewModeWrapper: React.FC<{
  vcrId: string;
  onApproversChange?: (approvers: VCRApprover[]) => void;
}> = ({ vcrId, onApproversChange }) => {
  const subMode = useVCRWizardSubMode();

  if (subMode === 'review_only') {
    return (
      <ApproverDecisionList
        handoverPointId={vcrId}
        title="Approvers"
        subtitle="Decisions recorded by each approver."
      />
    );
  }

  if (subMode === 'ora_edit') {
    // ORA Lead editing the roster — render the editable ApproversStep with
    // inline decision badges per card (decisions for peers are typically
    // Pending in Phase-1). No separate "Decisions so far" section.
    return (
      <OraEditApprovers
        vcrId={vcrId}
        onApproversChange={onApproversChange}
      />
    );
  }

  return <ApproversStep vcrId={vcrId} onApproversChange={onApproversChange} />;
};

const OraEditApprovers: React.FC<{
  vcrId: string;
  onApproversChange?: (a: VCRApprover[]) => void;
}> = ({ vcrId, onApproversChange }) => {
  const { data: roster } = useRoster(vcrId);
  const decisionsByUser = new Map<string, ApproverRow>();
  (roster || []).forEach((r) => {
    if (r.user_id) decisionsByUser.set(r.user_id, r);
  });
  return (
    <ApproversStep
      vcrId={vcrId}
      onApproversChange={onApproversChange}
      renderDecisionBadge={(userId) => {
        const row = userId ? decisionsByUser.get(userId) : undefined;
        if (!row) return null;
        return (
          <div className="flex items-center gap-1.5">
            {statusChip(row.status)}
            {row.decided_at && (
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(row.decided_at), 'd MMM, HH:mm')}
              </span>
            )}
          </div>
        );
      }}
    />
  );
};
