import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Clock, 
  User, 
  Calendar,
  MessageSquare,
  PenLine,
  Shield,
  FileCheck
} from 'lucide-react';
import { format } from 'date-fns';

interface ORAApprovalsPanelProps {
  planId: string;
}

interface ApprovalRecord {
  id: string;
  role: string;
  name: string;
  position: string;
  email: string;
  avatarUrl: string | null;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  approvalDate: Date | null;
  comments: string | null;
  signatureData: string | null;
  sequenceOrder: number;
}

// Mock data with actual user names from the database
const getMockApprovals = (): ApprovalRecord[] => [
  {
    id: '1',
    role: 'ORA Lead',
    name: 'Daniel Memuletiwon',
    position: 'ORA Lead',
    email: 'd.memuletiwon@basrahgas.iq',
    avatarUrl: 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/05b44255-4358-450c-8aa4-0558b31df70b/1764593060327.jpg',
    status: 'APPROVED',
    approvalDate: new Date('2026-01-05T09:30:00'),
    comments: 'All ORA activities have been reviewed and verified. Training plan is comprehensive and maintenance readiness checklist is complete. Recommend approval.',
    signatureData: 'D. Memuletiwon',
    sequenceOrder: 1
  },
  {
    id: '2',
    role: 'Project Manager',
    name: 'Wolfgang Probst',
    position: 'Project Manager',
    email: 'wolfgang.probst@basrahgas.iq',
    avatarUrl: 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/fbb630cc-de25-4f9e-9e8e-7c956928bb05/1767654993368.jpeg',
    status: 'APPROVED',
    approvalDate: new Date('2026-01-06T14:15:00'),
    comments: 'Project deliverables align with operational requirements. Resource allocation is adequate. Approved for next phase.',
    signatureData: 'W. Probst',
    sequenceOrder: 2
  },
  {
    id: '3',
    role: 'Deputy Plant Director',
    name: 'Nathan Stephenson',
    position: 'Project Manager – South',
    email: 'nathan.stephenson@basrahgas.iq',
    avatarUrl: 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/d58774a0-725e-4f0e-b18f-5ca6c2d7fbf6/1767655392833.jpg',
    status: 'APPROVED',
    approvalDate: new Date('2026-01-07T11:45:00'),
    comments: 'Reviewed handover documentation and maintenance readiness. All safety protocols have been addressed. Approved.',
    signatureData: 'N. Stephenson',
    sequenceOrder: 3
  },
  {
    id: '4',
    role: 'Plant Director',
    name: 'Victor Liew',
    position: 'Project Hub Lead – Central – Zubair',
    email: 'victor.V.Liew@basrahgas.iq',
    avatarUrl: 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/73734adc-61dd-4557-b613-84fe0ed2f49f/1757605348385.png',
    status: 'APPROVED',
    approvalDate: new Date('2026-01-08T16:30:00'),
    comments: 'Final approval granted. ORA Plan meets all operational readiness criteria. Authorized for implementation.',
    signatureData: 'V. Liew',
    sequenceOrder: 4
  }
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="destructive">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
};

const ApprovalCard: React.FC<{ approval: ApprovalRecord; isLast: boolean }> = ({ approval, isLast }) => {
  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-green-500 to-green-300 dark:from-green-600 dark:to-green-800" />
      )}
      
      <Card className="relative border-l-4 border-l-green-500 bg-card/50 backdrop-blur-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Sequence number badge */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-sm font-bold shadow-md">
                {approval.sequenceOrder}
              </div>
              
              <Avatar className="h-14 w-14 border-2 border-green-500/30 shadow-md">
                <AvatarImage src={approval.avatarUrl || undefined} alt={approval.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(approval.name)}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <CardTitle className="text-lg font-semibold">{approval.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium text-primary">{approval.role}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground text-sm">{approval.position}</span>
                </CardDescription>
              </div>
            </div>
            
            {getStatusBadge(approval.status)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Approval Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Approval Date */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approval Date & Time</p>
                <p className="text-sm font-semibold mt-1">
                  {approval.approvalDate 
                    ? format(approval.approvalDate, "MMMM d, yyyy 'at' h:mm a")
                    : 'Pending'
                  }
                </p>
              </div>
            </div>
            
            {/* Digital Signature */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <PenLine className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Digital Signature</p>
                <div className="mt-1 flex items-center gap-2">
                  {approval.signatureData ? (
                    <>
                      <span className="font-signature text-xl italic text-primary">
                        {approval.signatureData}
                      </span>
                      <FileCheck className="w-4 h-4 text-green-500" />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not signed</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Comments Section */}
          {approval.comments && (
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Approval Comments
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    "{approval.comments}"
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Email */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span>{approval.email}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const ORAApprovalsPanel: React.FC<ORAApprovalsPanelProps> = ({ planId }) => {
  const approvals = getMockApprovals();
  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
  const totalCount = approvals.length;
  const allApproved = approvedCount === totalCount;

  return (
    <div className="space-y-6 p-6">
      {/* Header Summary */}
      <Card className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  ORA Plan Approval Status
                </h2>
                <p className="text-muted-foreground mt-1">
                  Sequential approval workflow for Operations Readiness & Assurance Plan
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-2">
                {allApproved ? (
                  <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Fully Approved
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    <Clock className="w-5 h-5 mr-2" />
                    {approvedCount} of {totalCount} Approved
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Last updated: {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-muted-foreground">Approval Progress</span>
              <span className="font-semibold text-green-600">{Math.round((approvedCount / totalCount) * 100)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(approvedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Workflow Steps */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Approval Workflow
        </h3>
        
        <div className="space-y-4">
          {approvals.map((approval, index) => (
            <ApprovalCard 
              key={approval.id} 
              approval={approval} 
              isLast={index === approvals.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Summary Footer */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Approvals Received</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-3xl font-bold text-amber-600">{totalCount - approvedCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Pending Approvals</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-3xl font-bold text-primary">{totalCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Approvers</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-3xl font-bold text-blue-600">4</p>
              <p className="text-sm text-muted-foreground mt-1">Workflow Stages</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ORAApprovalsPanel;
