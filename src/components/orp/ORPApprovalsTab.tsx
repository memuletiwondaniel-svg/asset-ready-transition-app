import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, Clock, XCircle, Loader2, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface ORPApprovalsTabProps {
  planId: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  PENDING: { label: 'Pending', icon: Clock, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  REJECTED: { label: 'Rejected', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export const ORPApprovalsTab: React.FC<ORPApprovalsTabProps> = ({ planId }) => {
  const { data: approvals, isLoading } = useQuery({
    queryKey: ['orp-approvals', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_approvals')
        .select('id, approver_role, approver_user_id, status, comments, approved_at, created_at')
        .eq('orp_plan_id', planId)
        .order('created_at');

      if (error) throw error;

      // Fetch profiles for approvers
      const userIds = (data || []).map((a: any) => a.approver_user_id).filter(Boolean);
      const { data: profiles } = userIds.length > 0
        ? await supabase
            .from('profiles')
            .select('user_id, full_name, position, avatar_url')
            .in('user_id', userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return (data || []).map((a: any) => ({
        ...a,
        profile: profileMap.get(a.approver_user_id) || null,
      }));
    },
    enabled: !!planId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading approvals...</span>
      </div>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No approvers assigned</p>
      </div>
    );
  }

  const getAvatarUrl = (profile: any) => {
    if (!profile?.avatar_url) return undefined;
    if (profile.avatar_url.startsWith('http')) return profile.avatar_url;
    const { data } = supabase.storage.from('user-avatars').getPublicUrl(profile.avatar_url);
    return data?.publicUrl;
  };

  return (
    <div className="space-y-3">
      {approvals.map((approval: any) => {
        const config = STATUS_CONFIG[approval.status] || STATUS_CONFIG.PENDING;
        const StatusIcon = config.icon;
        const profile = approval.profile;
        const initials = profile?.full_name
          ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
          : '?';

        return (
          <div
            key={approval.id}
            className="flex items-start gap-3 p-4 rounded-lg border bg-card"
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={getAvatarUrl(profile)} />
              <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {profile?.full_name || 'Unassigned'}
                </span>
              </div>
              {profile?.position && (
                <p className="text-xs text-muted-foreground mt-0.5">{profile.position}</p>
              )}
              {!profile?.position && (
                <p className="text-xs text-muted-foreground mt-0.5">{approval.approver_role}</p>
              )}

              {approval.comments && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                  <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{approval.comments}</span>
                </div>
              )}

              {approval.approved_at && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {approval.status === 'APPROVED' ? 'Approved' : 'Responded'} on{' '}
                  {format(parseISO(approval.approved_at), 'MMM d, yyyy \'at\' h:mm a')}
                </p>
              )}
            </div>

            <Badge variant="outline" className={cn("text-[10px] gap-1 shrink-0", config.className)}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};
