import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface P2AActivityFeedProps {
  planId: string;
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

export const P2AActivityFeed: React.FC<P2AActivityFeedProps> = ({ planId }) => {
  // Current cycle approver decisions
  const { data: approverDecisions } = useQuery({
    queryKey: ['p2a-approver-decisions', planId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('p2a_handover_approvers')
        .select('id, user_id, role_name, status, comments, approved_at')
        .eq('handover_id', planId)
        .not('approved_at', 'is', null)
        .order('approved_at', { ascending: false });
      if (!data?.length) return [];
      const ids = [...new Set(data.map((d: any) => d.user_id).filter(Boolean))];
      const profileMap = await resolveProfiles(ids as string[]);
      return data.map((d: any) => ({
        ...d,
        full_name: profileMap[d.user_id]?.full_name || d.role_name,
        avatar_url: profileMap[d.user_id]?.avatar_url || null,
        cycle: null as number | null,
      }));
    },
    staleTime: 0,
    refetchOnMount: 'always',

  // Archived history (previous cycles + submissions/reverts)
  const { data: approverHistory } = useQuery({
    queryKey: ['p2a-approver-history', planId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('p2a_approver_history')
        .select('id, user_id, role_name, status, comments, approved_at, cycle')
        .eq('handover_id', planId)
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
    refetchOnMount: 'always',

  // Submission entry
  const { data: submissionEntry } = useQuery({
    queryKey: ['p2a-submission-entry', planId],
    queryFn: async () => {
      const { data: plan } = await (supabase as any)
        .from('p2a_handover_plans')
        .select('created_by')
        .eq('id', planId)
        .single();
      const { data: approvers } = await (supabase as any)
        .from('p2a_handover_approvers')
        .select('created_at')
        .eq('handover_id', planId)
        .order('created_at', { ascending: true })
        .limit(1);
      const submittedAt = approvers?.[0]?.created_at;
      if (!submittedAt || !plan?.created_by) return null;
      const profileMap = await resolveProfiles([plan.created_by]);
      const profile = profileMap[plan.created_by];
      return { submitted_at: submittedAt, full_name: profile?.full_name || 'Unknown', avatar_url: profile?.avatar_url || null };
    },
    staleTime: 0,
    refetchOnMount: 'always',

  // Build unified feed
  const feed = React.useMemo(() => {
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
    const entries: FeedEntry[] = [];

    (approverDecisions || []).forEach((d: any) => {
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

    (approverHistory || []).forEach((d: any) => {
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

    if (submissionEntry) {
      entries.push({
        id: 'submission-entry',
        type: 'submission',
        status: null,
        role_name: null,
        comment: null,
        full_name: submissionEntry.full_name,
        avatar_url: submissionEntry.avatar_url,
        timestamp: submissionEntry.submitted_at,
        cycle: null,
      });
    }

    return entries
      .filter(e => e.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [approverDecisions, approverHistory, submissionEntry]);

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
              {entry.type === 'submission' || (entry.type === 'approval_action' && entry.status === 'SUBMITTED') ? (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-0 font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      Submitted
                    </Badge>
                  </div>
                  {entry.comment && (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-1">{entry.comment}</p>
                  )}
                </>
              ) : entry.type === 'approval_action' && entry.status === 'REVERTED' ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-0 font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  >
                    Reverted to Draft
                  </Badge>
                </div>
              ) : entry.type === 'approval_action' ? (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap">
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
                  </div>
                  {entry.comment && (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-1">{entry.comment}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{entry.comment}</p>
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
