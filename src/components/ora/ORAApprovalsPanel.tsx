import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Clock, 
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ORAApprovalsPanelProps {
  planId: string;
}

interface ApprovalRecord {
  id: string;
  sequenceOrder: number;
  role: string;
  name: string;
  position: string;
  avatarUrl: string | null;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  approvalDate: Date | null;
  comments: string | null;
}

const getFullAvatarUrl = (avatarUrl: string | null) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const { data } = supabase.storage.from('user-avatars').getPublicUrl(avatarUrl);
  return data.publicUrl;
};

// Fetch approvals from the database for a specific plan
const useORPApprovals = (planId: string) => {
  return useQuery({
    queryKey: ['orp-approvals', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_approvals')
        .select('*')
        .eq('orp_plan_id', planId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!planId
  });
};

// Fetch profiles for approvers by user_id
const useApproverProfilesByIds = (userIds: string[]) => {
  return useQuery({
    queryKey: ['approver-profiles-by-id', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, first_name, last_name, position, avatar_url')
        .in('user_id', userIds);

      if (error) throw error;
      return data || [];
    },
    enabled: userIds.length > 0
  });
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return {
        icon: CheckCircle2,
        label: 'Approved',
        badgeClass: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800',
        accentClass: 'border-l-green-500/60'
      };
    case 'PENDING':
      return {
        icon: Clock,
        label: 'Pending',
        badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
        accentClass: 'border-l-amber-500/60'
      };
    case 'REJECTED':
      return {
        icon: XCircle,
        label: 'Rejected',
        badgeClass: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
        accentClass: 'border-l-red-500/60'
      };
    default:
      return {
        icon: Clock,
        label: 'Unknown',
        badgeClass: 'bg-muted text-muted-foreground',
        accentClass: 'border-l-muted'
      };
  }
};

interface ApprovalCardProps {
  approval: ApprovalRecord;
  isLast: boolean;
}

const ApprovalCard = ({ approval, isLast }: ApprovalCardProps) => {
  const config = getStatusConfig(approval.status);
  const StatusIcon = config.icon;

  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[3px] top-[36px] bottom-[-8px] w-px bg-border" />
      )}
      
      <div className="flex gap-2.5">
        {/* Card content */}
        <Card className={cn("flex-1 border-l-2", config.accentClass)}>
          <CardContent className="p-4">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={approval.avatarUrl || undefined} alt={approval.name} />
                  <AvatarFallback className="text-xs bg-muted">
                    {getInitials(approval.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{approval.name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-sm text-muted-foreground">{approval.position}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{approval.role}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-shrink-0">
                {approval.approvalDate && (
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {format(approval.approvalDate, 'MMM d, h:mm a')}
                  </span>
                )}
                <Badge variant="outline" className={cn("font-medium", config.badgeClass)}>
                  <StatusIcon className="h-3.5 w-3.5 mr-1" />
                  {config.label}
                </Badge>
              </div>
            </div>

            {/* Comments */}
            {approval.comments && (
              <div className="mt-2 ml-12 text-sm">
                <p className="text-muted-foreground">"{approval.comments}"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const ORAApprovalsPanel: React.FC<ORAApprovalsPanelProps> = ({ planId }) => {
  // Fetch real approvals from the database
  const { data: dbApprovals, isLoading: approvalsLoading } = useORPApprovals(planId);
  
  // Extract user IDs from approvals that have approver_user_id
  const approverUserIds = useMemo(() => {
    return (dbApprovals || [])
      .map(a => a.approver_user_id)
      .filter((id): id is string => !!id);
  }, [dbApprovals]);

  // Fetch profiles for those users
  const { data: profiles, isLoading: profilesLoading } = useApproverProfilesByIds(approverUserIds);

  // Build approvals list with real user data
  const approvals = useMemo((): ApprovalRecord[] => {
    if (!dbApprovals) return [];

    const profileMap = new Map(
      profiles?.map(p => [p.user_id, p]) || []
    );

    return dbApprovals.map((dbApproval, index) => {
      const profile = dbApproval.approver_user_id 
        ? profileMap.get(dbApproval.approver_user_id) 
        : null;
      
      const fullName = profile?.full_name || 
        (profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}` 
          : dbApproval.approver_role);

      const position = profile?.position || dbApproval.approver_role;

      return {
        id: dbApproval.id,
        sequenceOrder: index + 1,
        role: dbApproval.approver_role,
        name: fullName,
        position: position,
        avatarUrl: getFullAvatarUrl(profile?.avatar_url || null),
        status: dbApproval.status as 'APPROVED' | 'PENDING' | 'REJECTED',
        approvalDate: dbApproval.approved_at ? new Date(dbApproval.approved_at) : null,
        comments: dbApproval.comments
      };
    });
  }, [dbApprovals, profiles]);

  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
  const totalCount = approvals.length;
  const progress = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;
  const allApproved = totalCount > 0 && approvedCount === totalCount;

  const isLoading = approvalsLoading || profilesLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-5 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="p-6 space-y-5 max-w-3xl mx-auto">
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No Approvals Configured</p>
          <p className="text-sm">Approval workflow has not been set up for this plan yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <CheckCircle2 className={cn(
            "h-5 w-5",
            allApproved ? "text-green-500" : "text-muted-foreground"
          )} />
          <h3 className="text-lg font-semibold">ORA Plan Approvals</h3>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="w-20 h-2" />
          <span className="text-sm text-muted-foreground font-medium">
            {approvedCount}/{totalCount}
          </span>
          <Badge variant={allApproved ? "default" : "secondary"}>
            {allApproved ? "Complete" : "In Progress"}
          </Badge>
        </div>
      </div>

      {/* Approval Cards */}
      <div className="space-y-2">
        {approvals.map((approval, index) => (
          <ApprovalCard 
            key={approval.id} 
            approval={approval}
            isLast={index === approvals.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

export default ORAApprovalsPanel;
