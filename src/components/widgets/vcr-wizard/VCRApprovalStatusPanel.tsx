import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Lock,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared VCR plan approval-status panel for Step 10 (review and submitter
 * read-only modes). Mirrors the P2A "Approval status" design:
 *   - Header with code · "VCR Plan" subtitle + status pill
 *   - Progress bar "N of 5 approved"
 *   - Phase 1 (ORA Lead gate) group
 *   - Phase 2 group: greyed Locked rows while Phase 1 pending, then
 *     parallel Pending/Approved rows once ORA Lead approves
 *   - B2B badges (paired same-position holders) + legend
 *   - Viewer-aware footer (Recall for submitter, decision recap for
 *     decided approver, "Viewing only" for observers)
 *
 * Viewer role is computed **inside** the panel from auth.uid() vs the
 * plan's submitter and approver identities — so call sites cannot
 * mis-pass the role (root cause of the previous "observer for submitter"
 * bug).
 */
export interface VCRApprovalStatusPanelProps {
  handoverPointId: string;
  vcrCode?: string | null;
  vcrName?: string | null;
  onRecall?: () => void;
}

interface ApproverRow {
  approver_row_id: string;
  user_id: string | null;
  role_key: string | null;
  role_label: string;
  phase: number | null;
  row_status: 'PENDING' | 'APPROVED' | 'REJECTED' | string | null;
  decided_at: string | null;
  comments: string | null;
  approver_order: number | null;
  execution_plan_status: string;
}

interface ProfileLite {
  user_id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  position?: string | null;
  avatar_url?: string | null;
}

const resolveAvatarUrl = (avatarUrl?: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

const resolveName = (p?: ProfileLite | null): string => {
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

const normalizePosition = (p?: string | null) =>
  (p || '').toLowerCase().replace(/\s+/g, ' ').trim();

type RowDisplayStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'LOCKED';

const statusBadge = (status: RowDisplayStatus) => {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-full px-2.5 py-0.5 text-xs">
          Approved
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge className="bg-destructive/10 text-destructive border border-destructive/30 rounded-full px-2.5 py-0.5 text-xs">
          Changes requested
        </Badge>
      );
    case 'LOCKED':
      return (
        <Badge
          variant="outline"
          className="bg-muted text-muted-foreground border-border rounded-full px-2.5 py-0.5 text-xs gap-1"
        >
          <Lock className="h-3 w-3" />
          Locked
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-full px-2.5 py-0.5 text-xs"
        >
          Pending
        </Badge>
      );
  }
};

const ApproverLine: React.FC<{
  row: ApproverRow;
  profile?: ProfileLite | null;
  partner?: ProfileLite | null;
  displayStatus: RowDisplayStatus;
  locked: boolean;
}> = ({ row, profile, partner, displayStatus, locked }) => {
  const [open, setOpen] = useState(false);
  const hasUser = !!row.user_id;
  const name = hasUser ? resolveName(profile) : 'no holder assigned';
  const canExpand = !!row.decided_at && (displayStatus === 'APPROVED' || displayStatus === 'REJECTED');
  const hasComment = !!row.comments;

  return (
    <div className={cn('border-b last:border-b-0', locked && 'opacity-60')}>
      <button
        type="button"
        onClick={() => canExpand && setOpen((o) => !o)}
        disabled={!canExpand}
        aria-expanded={canExpand && open}
        data-rm-safe
        data-rm-nav
        className={cn(
          'w-full px-3 py-3 text-left flex items-center gap-3',
          canExpand ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-default',
        )}
      >
        {canExpand ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={resolveAvatarUrl(profile?.avatar_url)} alt={name} />
          <AvatarFallback className="text-[10px] bg-muted">
            {hasUser ? getInitials(name) : <CircleDashed className="h-3.5 w-3.5" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate font-medium text-sm">{hasUser ? name : row.role_label}</span>
            {partner && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 cursor-default">
                    B2B
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" sideOffset={4} className="text-xs max-w-[240px]">
                  Back-to-back pair — either {name} or {resolveName(partner)} can close the approval.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
            {row.role_label}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge(displayStatus)}
          {row.decided_at && (displayStatus === 'APPROVED' || displayStatus === 'REJECTED') && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {format(new Date(row.decided_at), 'd MMM, HH:mm')}
            </span>
          )}
        </div>
      </button>
      {open && canExpand && !hasComment && (
        <div className="px-12 pb-3 -mt-1 text-[12px] text-muted-foreground/70 italic">
          No comment left.
        </div>
      )}
      {open && canExpand && hasComment && (
        <div
          className={cn(
            'px-12 pb-3 -mt-1 text-[12px] text-muted-foreground border-l-2 italic',
            displayStatus === 'APPROVED' ? 'border-emerald-500/40' : 'border-red-500/40',
          )}
        >
          "{row.comments}"
        </div>
      )}
    </div>
  );
};

const formatDecisionDate = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const VCRApprovalStatusPanel: React.FC<VCRApprovalStatusPanelProps> = ({
  handoverPointId,
  vcrCode,
  vcrName,
  onRecall,
}) => {
  const { user } = useAuth();
  const { data: profileUsers } = useProfileUsers();

  // Approver roster + per-row phase from the view (carries `phase`,
  // `row_status`, `decided_at`, role identity, plan status).
  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ['vcr-approval-status-panel-rows', handoverPointId],
    enabled: !!handoverPointId,
    queryFn: async () => {
      const client = supabase as any;
      const [{ data: viewRows, error: viewErr }, { data: tableRows, error: tableErr }] = await Promise.all([
        client
          .from('v_vcr_plan_approver_tasks')
          .select(
            'approver_row_id, user_id, role_key, role_label, phase, row_status, decided_at, execution_plan_status',
          )
          .eq('handover_point_id', handoverPointId),
        // The view doesn't carry comments or approver_order; pull from the table.
        client
          .from('vcr_plan_approvers')
          .select('id, comments, approver_order')
          .eq('handover_point_id', handoverPointId),
      ]);
      if (viewErr) throw viewErr;
      if (tableErr) throw tableErr;
      const extras = new Map<string, { comments: string | null; approver_order: number | null }>();
      (tableRows || []).forEach((t: any) =>
        extras.set(t.id, { comments: t.comments, approver_order: t.approver_order }),
      );
      const rows: ApproverRow[] = (viewRows || []).map((r: any) => ({
        approver_row_id: r.approver_row_id,
        user_id: r.user_id,
        role_key: r.role_key,
        role_label: r.role_label,
        phase: r.phase ?? null,
        row_status: r.row_status,
        decided_at: r.decided_at,
        execution_plan_status: r.execution_plan_status,
        comments: extras.get(r.approver_row_id)?.comments ?? null,
        approver_order: extras.get(r.approver_row_id)?.approver_order ?? null,
      }));
      rows.sort((a, b) => (a.approver_order ?? 99) - (b.approver_order ?? 99));
      return rows;
    },
  });

  // Plan submitter — drives "submitter" viewer role.
  const { data: submitterId } = useQuery({
    queryKey: ['vcr-approval-status-panel-submitter', handoverPointId],
    enabled: !!handoverPointId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('p2a_handover_points')
        .select('execution_plan_submitted_by')
        .eq('id', handoverPointId)
        .maybeSingle();
      return (data?.execution_plan_submitted_by as string | null) ?? null;
    },
  });

  const rows = roster || [];
  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileLite>();
    (profileUsers || []).forEach((p: any) =>
      m.set(p.user_id, {
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        position: p.position,
        avatar_url: p.avatar_url,
      }),
    );
    return m;
  }, [profileUsers]);

  // B2B partner detection (same position, exactly one other holder).
  const partnerByRowId = useMemo(() => {
    const m = new Map<string, ProfileLite | null>();
    if (!profileUsers) return m;
    rows.forEach((r) => {
      if (!r.user_id) { m.set(r.approver_row_id, null); return; }
      const me = profileMap.get(r.user_id);
      const myPos = normalizePosition(me?.position);
      if (!myPos) { m.set(r.approver_row_id, null); return; }
      const sharing = (profileUsers as any[]).filter((u) => normalizePosition(u.position) === myPos);
      const others = sharing.filter((u) => u.user_id !== r.user_id);
      m.set(
        r.approver_row_id,
        sharing.length === 2 && others.length === 1
          ? {
              user_id: others[0].user_id,
              full_name: others[0].full_name,
              avatar_url: others[0].avatar_url,
            }
          : null,
      );
    });
    return m;
  }, [profileUsers, profileMap, rows]);

  const planStatus = rows[0]?.execution_plan_status as string | undefined;
  const planPhase = rows[0]?.phase ?? null;
  const hasAnyB2B = Array.from(partnerByRowId.values()).some(Boolean);

  // Phase grouping: ORA Lead alone in Phase 1 gate; rest in Phase 2.
  // Drives "Locked" visual until ORA Lead approves.
  const oraRow = rows.find((r) => r.role_key === 'ora_lead');
  const oraApproved = oraRow?.row_status === 'APPROVED';
  const phase1Rows = rows.filter((r) => r.role_key === 'ora_lead');
  const phase2Rows = rows.filter((r) => r.role_key !== 'ora_lead');

  const computeDisplay = (r: ApproverRow, locked: boolean): RowDisplayStatus => {
    const s = (r.row_status || 'PENDING').toUpperCase();
    if (s === 'APPROVED') return 'APPROVED';
    if (s === 'REJECTED') return 'REJECTED';
    if (locked) return 'LOCKED';
    return 'PENDING';
  };

  const total = rows.length;
  const approved = rows.filter((r) => r.row_status === 'APPROVED').length;
  const progress = total > 0 ? (approved / total) * 100 : 0;
  const planAllApproved = total > 0 && approved === total;
  const anyRejected = rows.some((r) => r.row_status === 'REJECTED');

  // ── Viewer-role resolution (internal — call sites cannot mis-pass) ──
  // Submitter wins when the viewer is the plan submitter AND the plan is
  // still recallable (SUBMITTED with no full approval). A fully approved
  // plan: submitter no longer sees Recall.
  const viewerIsSubmitter =
    !!user?.id && !!submitterId && user.id === submitterId && planStatus === 'SUBMITTED';
  const viewerApproverRow = rows.find((r) => r.user_id && r.user_id === user?.id);
  const viewerDecided =
    !!viewerApproverRow && viewerApproverRow.row_status !== 'PENDING' && !!viewerApproverRow.row_status;

  const planPill = (() => {
    if (planAllApproved) {
      return { label: 'Approved', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' };
    }
    if (anyRejected) {
      return { label: 'Changes requested', cls: 'bg-destructive/10 text-destructive border-destructive/30' };
    }
    if (planPhase === 1) {
      return { label: 'Awaiting ORA Lead', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' };
    }
    if (planPhase === 2) {
      return { label: 'In parallel review', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' };
    }
    return { label: 'Pending approval', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' };
  })();

  // Viewer-aware footer was removed — Recall now lives in the wizard
  // footer row, and decided approvers see their decision on their own
  // approver row. No extra block is rendered here.


  const renderRows = (group: ApproverRow[], locked: boolean) =>
    group.map((r) => (
      <ApproverLine
        key={r.approver_row_id}
        row={r}
        profile={r.user_id ? profileMap.get(r.user_id) ?? null : null}
        partner={partnerByRowId.get(r.approver_row_id) ?? null}
        displayStatus={computeDisplay(r, locked)}
        locked={locked && r.row_status !== 'APPROVED' && r.row_status !== 'REJECTED'}
      />
    ));

  return (
    <TooltipProvider delayDuration={150}>
      <div className="max-w-3xl mx-auto p-1 space-y-4">
        {/* Header */}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">Approval status</h2>
        </div>


        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {approved} of {total} approved
            </span>
            {planAllApproved && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
              </span>
            )}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Phase 1 */}
        {rosterLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!rosterLoading && total === 0 && (
          <div className="rounded-md border bg-card/30 px-4 py-6 text-sm text-muted-foreground text-center">
            No approvers configured.
          </div>
        )}

        {!rosterLoading && phase1Rows.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phase 1 — ORA Lead
              </h3>
              {oraApproved && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Gate cleared
                </span>
              )}
            </div>
            <div className="rounded-lg border bg-card/30 overflow-hidden">
              {renderRows(phase1Rows, false)}
            </div>
          </section>
        )}

        {/* Phase 2 */}
        {!rosterLoading && phase2Rows.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phase 2
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {oraApproved ? 'In parallel review' : 'Unlocks when ORA Lead approves'}
              </span>
            </div>
            <div className="rounded-lg border bg-card/30 overflow-hidden">
              {renderRows(phase2Rows, !oraApproved)}
            </div>
          </section>
        )}

        {/* B2B legend */}
        {hasAnyB2B && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              B2B
            </span>
            Back-to-back — either holder of the pair can close the approval.
          </p>
        )}



      </div>
    </TooltipProvider>
  );
};

export default VCRApprovalStatusPanel;
