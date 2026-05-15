import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface P2AApprovalsPanelProps {
  planId: string;
}

const getFullAvatarUrl = (avatarUrl: string | null | undefined) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const { data } = supabase.storage.from('user-avatars').getPublicUrl(avatarUrl);
  return data.publicUrl;
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return { icon: CheckCircle2, label: 'Approved', badgeClass: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800', accentClass: 'border-l-green-500/60' };
    case 'REJECTED':
      return { icon: XCircle, label: 'Rejected', badgeClass: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800', accentClass: 'border-l-red-500/60' };
    default:
      return { icon: Clock, label: 'Pending', badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800', accentClass: 'border-l-amber-500/60' };
  }
};

export const P2AApprovalsPanel: React.FC<P2AApprovalsPanelProps> = ({ planId }) => {
  const client = supabase as any;

  const { data: approvers, isLoading } = useQuery({
    queryKey: ['p2a-approvals-panel', planId],
    queryFn: async () => {
      const { data } = await client
        .from('p2a_handover_approvers')
        .select('id, role_name, user_id, display_order, status, approved_at, comments')
        .eq('handover_id', planId)
        .order('display_order');

      const userIds = (data || []).filter((a: any) => a.user_id).map((a: any) => a.user_id);
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await client
          .from('profiles')
          .select('user_id, full_name, first_name, last_name, position, avatar_url')
          .in('user_id', userIds);
        (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      }

      return (data || []).map((a: any) => {
        const p = profileMap[a.user_id];
        const fullName = p?.full_name || (p?.first_name && p?.last_name ? `${p.first_name} ${p.last_name}` : null);
        return {
          ...a,
          name: fullName || a.role_name,
          position: p?.position || a.role_name,
          avatar: getFullAvatarUrl(p?.avatar_url),
        };
      });
    },
    enabled: !!planId,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-3 max-w-3xl mx-auto">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded animate-pulse" />)}
      </div>
    );
  }

  const list = approvers || [];
  const approvedCount = list.filter((a: any) => a.status === 'APPROVED').length;
  const total = list.length;
  const progress = total > 0 ? (approvedCount / total) * 100 : 0;
  const allApproved = total > 0 && approvedCount === total;

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <CheckCircle2 className={cn("h-5 w-5", allApproved ? "text-green-500" : "text-muted-foreground")} />
          <h3 className="text-lg font-semibold">P2A Handover Approvals</h3>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="w-20 h-2" />
          <span className="text-sm text-muted-foreground font-medium">{approvedCount}/{total}</span>
          <Badge variant={allApproved ? "default" : "secondary"}>
            {allApproved ? "Complete" : "In Progress"}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        {list.map((a: any, idx: number) => {
          const cfg = getStatusConfig(a.status);
          const StatusIcon = cfg.icon;
          const isLast = idx === list.length - 1;
          return (
            <div key={a.id} className="relative">
              {!isLast && <div className="absolute left-[3px] top-[36px] bottom-[-8px] w-px bg-border" />}
              <Card className={cn("border-l-2", cfg.accentClass)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={a.avatar || undefined} alt={a.name} />
                        <AvatarFallback className="text-xs bg-muted">{getInitials(a.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{a.name}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground">{a.position}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {a.approved_at && (
                        <span className="text-sm text-muted-foreground hidden sm:block">
                          {format(new Date(a.approved_at), 'MMM d, h:mm a')}
                        </span>
                      )}
                      <Badge variant="outline" className={cn("font-medium", cfg.badgeClass)}>
                        <StatusIcon className="h-3.5 w-3.5 mr-1" />
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>
                  {a.comments && (
                    <div className="mt-2 ml-12 text-sm">
                      <p className="text-muted-foreground">"{a.comments}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No approvers configured yet.</p>
        )}
      </div>
    </div>
  );
};

export default P2AApprovalsPanel;
