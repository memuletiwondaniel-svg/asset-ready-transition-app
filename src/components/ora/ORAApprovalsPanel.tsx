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

const APPROVAL_SEQUENCE = [
  { role: 'ORA Lead', defaultPosition: 'Operations Readiness Lead' },
  { role: 'Project Manager', defaultPosition: 'Senior Project Manager' },
  { role: 'Deputy Plant Director', defaultPosition: 'Deputy Plant Director' },
  { role: 'Plant Director', defaultPosition: 'Plant Director' }
];

const getFullAvatarUrl = (avatarUrl: string | null) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const { data } = supabase.storage.from('user-avatars').getPublicUrl(avatarUrl);
  return data.publicUrl;
};

/**
 * Dynamically resolves approver profiles by querying the roles table
 * and joining to profiles, instead of hardcoding email addresses.
 */
const useApproverProfiles = () => {
  return useQuery({
    queryKey: ['ora-approver-profiles-by-role'],
    queryFn: async () => {
      const roleNames = APPROVAL_SEQUENCE.map(s => s.role);

      // Get role IDs for the approval role names
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', roleNames);

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      const roleIds = roles.map(r => r.id);

      // Get profiles that have one of these roles assigned
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('role, full_name, first_name, last_name, position, avatar_url, email')
        .in('role', roleIds);

      if (profilesError) throw profilesError;

      // Map role ID back to role name for lookup
      const roleIdToName = new Map(roles.map(r => [r.id, r.name]));

      return (profiles || []).map(p => ({
        ...p,
        roleName: roleIdToName.get(p.role || '') || null,
      }));
    }
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
        badgeClass: '',
        accentClass: 'border-l-border'
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
      {!isLast && (
        <div className="absolute left-[3px] top-[36px] bottom-[-8px] w-px bg-border" />
      )}
      
      <div className="flex gap-2.5">
        <Card className={cn("flex-1 border-l-2", config.accentClass)}>
          <CardContent className="p-4">
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
  const { data: profiles, isLoading } = useApproverProfiles();

  const approvals = useMemo((): ApprovalRecord[] => {
    // Build a map from role name to profile
    const roleProfileMap = new Map<string, typeof profiles extends (infer T)[] ? T : never>();
    profiles?.forEach(p => {
      if (p.roleName && !roleProfileMap.has(p.roleName)) {
        roleProfileMap.set(p.roleName, p);
      }
    });

    // Mock approval data - in production this would come from the database
    const mockApprovalData = [
      { status: 'APPROVED' as const, approvalDate: new Date('2026-01-05T09:30:00'), comments: 'All ORA activities have been reviewed and verified. Training plan is comprehensive and maintenance readiness checklist is complete.' },
      { status: 'APPROVED' as const, approvalDate: new Date('2026-01-06T14:15:00'), comments: 'Project deliverables align with operational requirements. Resource allocation is adequate.' },
      { status: 'APPROVED' as const, approvalDate: new Date('2026-01-07T11:45:00'), comments: 'Reviewed handover documentation and maintenance readiness. All safety protocols have been addressed.' },
      { status: 'APPROVED' as const, approvalDate: new Date('2026-01-08T16:30:00'), comments: 'Final approval granted. ORA Plan meets all operational readiness criteria.' }
    ];

    return APPROVAL_SEQUENCE.map((seq, index) => {
      const profile = roleProfileMap.get(seq.role);
      const approvalData = mockApprovalData[index];
      
      const fullName = profile?.full_name || 
        (profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}` 
          : seq.role);

      return {
        id: `${index + 1}`,
        sequenceOrder: index + 1,
        role: seq.role,
        name: fullName,
        position: profile?.position || seq.defaultPosition,
        avatarUrl: getFullAvatarUrl(profile?.avatar_url || null),
        status: approvalData.status,
        approvalDate: approvalData.approvalDate,
        comments: approvalData.comments
      };
    });
  }, [profiles]);

  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
  const totalCount = approvals.length;
  const progress = (approvedCount / totalCount) * 100;
  const allApproved = approvedCount === totalCount;

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

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
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
