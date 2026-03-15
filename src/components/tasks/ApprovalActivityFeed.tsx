import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Generic Approval Activity Feed — works for both P2A and ORA approval workflows.
 * Pass `source` to configure which tables to query.
 */

interface ApprovalActivityFeedProps {
  planId: string;
  source: 'p2a' | 'ora';
}

function resolveAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  return avatarUrl.startsWith('http')
    ? avatarUrl
    : supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
}

async function resolveProfiles(userIds: string[]) {
  const map: Record<string, { full_name: string; avatar_url: string | null }> = {};
  if (userIds.length === 0) return map;
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url')
    .in('user_id', userIds);
  if (profiles) {
    for (const p of profiles) {
      map[p.user_id] = { full_name: p.full_name || '', avatar_url: resolveAvatarUrl(p.avatar_url) };
    }
  }
  return map;
}

type FeedEntry = {
  id: string;
  type: 'submission' | 'approval_action' | 'comment';
  status: string | null;
  role_name: string | null;
  comment: string | null;
  full_name: string;
  avatar_url: string | null;
  timestamp: string;
  cycle: number | null;
};

function sortFeedEntries(entries: FeedEntry[]): FeedEntry[] {
  return entries.sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

export const ApprovalActivityFeed: React.FC<ApprovalActivityFeedProps> = ({ planId, source }) => {
  const client = supabase as any;

  // Current cycle decisions
  const { data: currentDecisions } = useQuery({
    queryKey: [`${source}-approver-decisions`, planId],
    queryFn: async () => {
      if (source === 'p2a') {
        const { data: plan } = await client
          .from('p2a_handover_plans')
          .select('status')
          .eq('id', planId)
          .maybeSingle();
        if (plan?.status === 'DRAFT') return [];
        const { data } = await client
          .from('p2a_handover_approvers')
          .select('id, user_id, role_name, status, comments, approved_at')
          .eq('handover_id', planId)
          .not('approved_at', 'is', null)
          .order('approved_at', { ascending: false });
        const ids = [...new Set((data || []).map((d: any) => d.user_id).filter(Boolean))];
        const profileMap = await resolveProfiles(ids as string[]);
        return (data || []).map((d: any) => ({
          ...d,
          full_name: profileMap[d.user_id]?.full_name || d.role_name,
          avatar_url: profileMap[d.user_id]?.avatar_url || null,
          cycle: null as number | null,
        }));
      } else {
        // ORA
        const { data: plan } = await client
          .from('orp_plans')
          .select('status')
          .eq('id', planId)
          .maybeSingle();
        if (plan?.status === 'DRAFT') return [];
        const { data } = await client
          .from('orp_approvals')
          .select('id, approver_user_id, approver_role, status, comments, approved_at')
          .eq('orp_plan_id', planId)
          .not('approved_at', 'is', null)
          .order('approved_at', { ascending: false });
        const ids = [...new Set((data || []).map((d: any) => d.approver_user_id).filter(Boolean))];
        const profileMap = await resolveProfiles(ids as string[]);
        return (data || []).map((d: any) => ({
          id: d.id,
          user_id: d.approver_user_id,
          role_name: d.approver_role,
          status: d.status,
          comments: d.comments,
          approved_at: d.approved_at,
          full_name: profileMap[d.approver_user_id]?.full_name || d.approver_role,
          avatar_url: profileMap[d.approver_user_id]?.avatar_url || null,
          cycle: null as number | null,
        }));
      }
    },
    staleTime: 0,
    refetchOnMount: 'always' as const,
  });

  // Archived history
  const { data: historyData } = useQuery({
    queryKey: [`${source}-approval-history`, planId],
    queryFn: async () => {
      const table = source === 'p2a' ? 'p2a_approver_history' : 'orp_approval_history';
      const planCol = source === 'p2a' ? 'handover_id' : 'orp_plan_id';
      const { data } = await client
        .from(table)
        .select('id, user_id, role_name, status, comments, approved_at, cycle')
        .eq(planCol, planId)
        .order('cycle', { ascending: false })
        .order('approved_at', { ascending: false });
      if (!data?.length) return [];
      const ids = [...new Set(data.map((d: any) => d.user_id).filter(Boolean))];
      const profileMap = await resolveProfiles(ids as string[]);
      return data.map((d: any) => ({
        ...d,
        full_name: profileMap[d.user_id]?.full_name || d.role_name,
        avatar_url: profileMap[d.user_id]?.avatar_url || null,
      }));
    },
    staleTime: 0,
    refetchOnMount: 'always' as const,
  });

  const feed = React.useMemo(() => {
    const entries: FeedEntry[] = [];

    (currentDecisions || []).forEach((d: any) => {
      entries.push({
        id: `decision-${d.id}`,
        type: 'approval_action',
        status: d.status,
        role_name: d.role_name,
        comment: d.comments,
        full_name: d.full_name,
        avatar_url: d.avatar_url,
        timestamp: d.approved_at,
        cycle: d.cycle,
      });
    });

    (historyData || []).forEach((d: any) => {
      entries.push({
        id: `history-${d.id}`,
        type: 'approval_action',
        status: d.status,
        role_name: d.role_name,
        comment: d.comments,
        full_name: d.full_name,
        avatar_url: d.avatar_url,
        timestamp: d.approved_at,
        cycle: d.cycle,
      });
    });

    return sortFeedEntries(entries.filter(e => e.timestamp));
  }, [currentDecisions, historyData]);

  if (feed.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
        <MessageSquare className="h-4 w-4" />
        Activity
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">{feed.length}</Badge>
      </p>
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {feed.map((entry) => (
          <div key={entry.id} className="flex gap-2.5">
            <Avatar className="h-6 w-6 shrink-0 mt-0.5">
              {entry.avatar_url && <AvatarImage src={entry.avatar_url} />}
              <AvatarFallback className="text-[9px] font-medium bg-muted">
                {(entry.full_name || '?').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {entry.status === 'SUBMITTED' ? (
                <>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-0 font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Submitted
                  </Badge>
                  {entry.comment && (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-1">{entry.comment}</p>
                  )}
                </>
              ) : entry.status === 'REVERTED' ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-0 font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Reverted to Draft
                </Badge>
              ) : (
                <>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 border-0 font-semibold",
                      entry.status === 'APPROVED'
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}
                  >
                    {entry.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </Badge>
                  {(() => {
                    const raw = entry.comment || '';
                    const cleaned = raw.replace(/^(Approved|Rejected)\s+by\s+[^\n]+\n?/i, '').trim();
                    return cleaned ? (
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-1">{cleaned}</p>
                    ) : null;
                  })()}
                </>
              )}
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {entry.full_name}
                {entry.role_name ? ` · ${entry.role_name}` : ''}
                {entry.cycle ? ` · Round ${entry.cycle}` : ''}
                {' · '}
                {formatDistanceToNow(parseISO(entry.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
