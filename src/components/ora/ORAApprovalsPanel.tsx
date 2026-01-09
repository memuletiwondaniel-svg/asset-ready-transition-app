import React from 'react';
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

interface ORAApprovalsPanelProps {
  planId: string;
}

interface ApprovalRecord {
  id: string;
  sequenceOrder: number;
  role: string;
  name: string;
  position: string;
  email: string;
  avatarUrl: string | null;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  approvalDate: Date | null;
  comments: string | null;
  signatureData: string | null;
}

const getMockApprovals = (): ApprovalRecord[] => [
  {
    id: '1',
    sequenceOrder: 1,
    role: 'ORA Lead',
    name: 'Roaa Abdullah',
    position: 'Operations Readiness Lead',
    email: '',
    avatarUrl: null,
    status: 'APPROVED',
    approvalDate: new Date('2026-01-05T09:30:00'),
    comments: 'All ORA activities have been reviewed and verified. Training plan is comprehensive and maintenance readiness checklist is complete.',
    signatureData: 'R. Abdullah'
  },
  {
    id: '2',
    sequenceOrder: 2,
    role: 'Project Manager',
    name: 'Wim Moelker',
    position: 'Senior Project Manager',
    email: '',
    avatarUrl: null,
    status: 'APPROVED',
    approvalDate: new Date('2026-01-06T14:15:00'),
    comments: 'Project deliverables align with operational requirements. Resource allocation is adequate.',
    signatureData: 'W. Moelker'
  },
  {
    id: '3',
    sequenceOrder: 3,
    role: 'Deputy Plant Director',
    name: 'Ewan McConnachie',
    position: 'Deputy Plant Director',
    email: '',
    avatarUrl: null,
    status: 'APPROVED',
    approvalDate: new Date('2026-01-07T11:45:00'),
    comments: 'Reviewed handover documentation and maintenance readiness. All safety protocols have been addressed.',
    signatureData: 'E. McConnachie'
  },
  {
    id: '4',
    sequenceOrder: 4,
    role: 'Plant Director',
    name: 'Yesr Tamoul',
    position: 'Plant Director',
    email: '',
    avatarUrl: null,
    status: 'APPROVED',
    approvalDate: new Date('2026-01-08T16:30:00'),
    comments: 'Final approval granted. ORA Plan meets all operational readiness criteria.',
    signatureData: 'Y. Tamoul'
  }
];

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
        accentClass: 'border-l-green-500/60',
        numberClass: 'bg-green-500/10 text-green-600'
      };
    case 'PENDING':
      return {
        icon: Clock,
        label: 'Pending',
        badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
        accentClass: 'border-l-amber-500/60',
        numberClass: 'bg-amber-500/10 text-amber-600'
      };
    case 'REJECTED':
      return {
        icon: XCircle,
        label: 'Rejected',
        badgeClass: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
        accentClass: 'border-l-red-500/60',
        numberClass: 'bg-red-500/10 text-red-600'
      };
    default:
      return {
        icon: Clock,
        label: 'Unknown',
        badgeClass: '',
        accentClass: 'border-l-border',
        numberClass: 'bg-muted text-muted-foreground'
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
          <CardContent className="p-2.5">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={approval.avatarUrl || undefined} alt={approval.name} />
                  <AvatarFallback className="text-[10px] bg-muted">
                    {getInitials(approval.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm">{approval.name}</span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-xs text-muted-foreground">{approval.position}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {approval.approvalDate && (
                  <span className="text-[11px] text-muted-foreground hidden sm:block">
                    {format(approval.approvalDate, 'MMM d, h:mm a')}
                  </span>
                )}
                <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-medium", config.badgeClass)}>
                  <StatusIcon className="h-3 w-3 mr-0.5" />
                  {config.label}
                </Badge>
              </div>
            </div>

            {/* Signature & Comments */}
            {approval.comments && (
              <div className="mt-1.5 ml-9 text-xs">
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
  const approvals = getMockApprovals();
  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
  const totalCount = approvals.length;
  const progress = (approvedCount / totalCount) * 100;
  const allApproved = approvedCount === totalCount;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-2">
          <CheckCircle2 className={cn(
            "h-4 w-4",
            allApproved ? "text-green-500" : "text-muted-foreground"
          )} />
          <h3 className="font-medium text-sm">ORA Plan Approvals</h3>
        </div>
        <div className="flex items-center gap-2.5">
          <Progress value={progress} className="w-16 h-1.5" />
          <span className="text-xs text-muted-foreground font-medium">
            {approvedCount}/{totalCount}
          </span>
          <Badge 
            variant={allApproved ? "default" : "secondary"} 
            className="text-[10px] h-5 px-1.5"
          >
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
