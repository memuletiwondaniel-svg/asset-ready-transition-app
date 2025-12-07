import React, { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { FullscreenWidgetModal } from './FullscreenWidgetModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Eye, Bell, ChevronRight, ShieldCheck, Lock, MessageSquare, FileText } from 'lucide-react';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChecklistCompletionBanner } from '@/components/pssr/ChecklistCompletionBanner';
import { ApprovalActionPanel } from '@/components/pssr/ApprovalActionPanel';
import { ApprovalHistoryPanel } from '@/components/pssr/ApprovalHistoryPanel';
import { PSSRApprover } from '@/hooks/usePSSRApprovers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SOFCertificate } from '@/components/sof/SOFCertificate';

export interface ApprovalPerson {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  pendingTasks: number;
  isOnline?: boolean;
  status?: 'completed' | 'in_progress' | 'waiting';
  completedAt?: string;
  order?: number;
  comments?: string;
}

interface PSSRReviewersApprovalsWidgetProps {
  reviewers: ApprovalPerson[];
  approvers: ApprovalPerson[];
  sofApprovers?: ApprovalPerson[];
  onSendReminder?: (personId: string) => void;
  onPersonClick?: (personId: string) => void;
  dragAttributes?: any;
  dragListeners?: any;
  // New props for enhanced functionality
  pssrId?: string;
  pssrTitle?: string;
  checklistCompletion?: {
    percentage: number;
    total: number;
    completed: number;
  };
  currentUserId?: string;
  currentUserApproverId?: string;
  currentUserRole?: string;
  onApprove?: (approverId: string, comments?: string) => Promise<void>;
  onReject?: (approverId: string, comments: string) => Promise<void>;
  approvalHistory?: PSSRApprover[];
  isApprovalLoading?: boolean;
  // SoF Certificate props
  pssrReason?: string;
  plantName?: string;
  facilityName?: string;
  projectName?: string;
}

const PersonApprovalCard: React.FC<{
  person: ApprovalPerson;
  isCurrentAction: boolean;
  isNextInQueue: boolean;
  isLocked: boolean;
  onSendReminder?: (personId: string) => void;
  onPersonClick?: (personId: string) => void;
}> = ({ person, isCurrentAction, isNextInQueue, isLocked, onSendReminder, onPersonClick }) => {
  const initials = person.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  // Determine status based on pendingTasks or explicit status
  const status = person.status || (person.pendingTasks === 0 ? 'completed' : 'in_progress');

  const getStatusIcon = () => {
    if (isLocked) return <div className="w-2 h-2 rounded-full border border-muted-foreground/50" />;
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'in_progress': return <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />;
      case 'waiting': return <div className="w-2 h-2 rounded-full border border-muted-foreground/50" />;
      default: return <div className="w-2 h-2 rounded-full border border-muted-foreground/50" />;
    }
  };

  const getStatusText = () => {
    if (status === 'completed') {
      return person.completedAt ? `Approved ${person.completedAt}` : 'Approved';
    }
    if (isLocked || status === 'waiting') {
      return 'Waiting';
    }
    return `${person.pendingTasks} pending`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={() => !isLocked && onPersonClick?.(person.id)}
            className={`
              relative flex items-center gap-3 p-3 rounded-lg 
              border transition-all
              ${isLocked 
                ? 'border-border/30 bg-muted/20 opacity-75 cursor-not-allowed'
                : isCurrentAction 
                  ? 'bg-primary/5 border-primary/30 cursor-pointer hover:bg-primary/10' 
                  : status === 'completed'
                    ? 'border-green-500/20 bg-green-500/5 cursor-pointer hover:bg-green-500/10'
                    : 'border-border/40 bg-card/50 cursor-pointer hover:bg-accent/10 hover:border-primary/30'
              }
              group
            `}
          >
            {/* Avatar */}
            <Avatar className={`h-9 w-9 border ${isLocked ? 'border-border/40' : 'border-border/50'}`}>
              <AvatarImage src={person.avatar} alt={person.name} />
              <AvatarFallback className="bg-muted text-muted-foreground font-medium text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium truncate ${
                  isLocked ? 'text-muted-foreground' :
                  status === 'completed' ? 'text-green-700 dark:text-green-400' : 'text-foreground'
                }`}>
                  {person.name}
                </p>
                {isCurrentAction && !isLocked && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                    ACTION
                  </Badge>
                )}
                {isNextInQueue && !isCurrentAction && !isLocked && (
                  <span className="text-[10px] text-muted-foreground">Next</span>
                )}
              </div>
              <p className={`text-xs truncate ${isLocked ? 'text-muted-foreground/80' : 'text-muted-foreground'}`}>
                {person.role}
              </p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={`text-[11px] ${isLocked ? 'text-muted-foreground/80' : 'text-muted-foreground'}`}>
                {getStatusText()}
              </span>
            </div>

            {/* Actions */}
            {!isLocked && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {status === 'in_progress' && onSendReminder && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendReminder(person.id);
                    }}
                  >
                    <Bell className="h-3.5 w-3.5" />
                  </Button>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {/* Comments indicator */}
            {person.comments && status === 'completed' && (
              <div className="absolute -bottom-1 right-3">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        {isLocked && (
          <TooltipContent>
            <p>Complete the previous stage to unlock this approval</p>
          </TooltipContent>
        )}
        {person.comments && status === 'completed' && !isLocked && (
          <TooltipContent className="max-w-[250px]">
            <p className="text-xs italic">"{person.comments}"</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

const StageSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  people: ApprovalPerson[];
  isCurrentStage: boolean;
  isLocked: boolean;
  lockReason?: string;
  onSendReminder?: (personId: string) => void;
  onPersonClick?: (personId: string) => void;
}> = ({ title, icon, people, isCurrentStage, isLocked, lockReason, onSendReminder, onPersonClick }) => {
  // Find the first person with pending tasks (action needed)
  const currentActionIndex = people.findIndex(p => p.pendingTasks > 0);
  const completedCount = people.filter(p => p.pendingTasks === 0 || p.status === 'completed').length;
  
  return (
    <TooltipProvider>
      <div className="space-y-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg transition-colors ${
              isLocked ? 'bg-muted/30' : isCurrentStage ? 'bg-primary/5' : ''
            }`}>
              <div className={`p-1.5 rounded-md ${
                isLocked ? 'bg-muted text-muted-foreground' :
                isCurrentStage ? 'bg-primary/10 text-primary' : 
                completedCount === people.length ? 'bg-green-500/10 text-green-600' :
                'bg-muted text-muted-foreground'
              }`}>
                {isLocked ? <Lock className="h-4 w-4" /> : icon}
              </div>
              <h4 className={`text-xs font-semibold uppercase tracking-wide ${
                isLocked ? 'text-muted-foreground/80' : 'text-muted-foreground'
              }`}>
                {title}
              </h4>
              <Badge 
                variant={completedCount === people.length ? 'default' : 'secondary'} 
                className={`text-[10px] px-1.5 py-0 ml-auto ${
                  completedCount === people.length ? 'bg-green-500 text-white' : ''
                }`}
              >
              {completedCount}/{people.length}
              </Badge>
            </div>
          </TooltipTrigger>
          {isLocked && lockReason && (
            <TooltipContent>
              <p>{lockReason}</p>
            </TooltipContent>
          )}
        </Tooltip>
        <div className="space-y-2">
          {people.map((person, index) => (
            <PersonApprovalCard
              key={person.id}
              person={person}
              isCurrentAction={index === currentActionIndex && isCurrentStage && !isLocked}
              isNextInQueue={index === currentActionIndex + 1 && isCurrentStage && !isLocked}
              isLocked={isLocked}
              onSendReminder={onSendReminder}
              onPersonClick={onPersonClick}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

const ApprovalProgress: React.FC<{
  reviewers: ApprovalPerson[];
  approvers: ApprovalPerson[];
  sofApprovers?: ApprovalPerson[];
  checklistComplete?: boolean;
}> = ({ reviewers, approvers, sofApprovers = [], checklistComplete = true }) => {
  const allPeople = [...reviewers, ...approvers, ...sofApprovers];
  const completed = allPeople.filter(p => p.pendingTasks === 0 || p.status === 'completed').length;
  const total = allPeople.length;

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Workflow Progress</span>
        <div className="flex items-center gap-1.5">
          {/* Checklist indicator */}
          <div className={`w-3 h-3 rounded-full border-2 ${
            checklistComplete ? 'bg-green-500 border-green-500' : 'border-amber-500 bg-amber-500/20'
          }`} />
          {/* People indicators */}
          {allPeople.map((person, index) => (
            <div
              key={person.id}
              className={`w-2 h-2 rounded-full ${
                person.pendingTasks === 0 || person.status === 'completed' 
                  ? 'bg-green-500' 
                  : 'bg-muted-foreground/20'
              }`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-2">{completed}/{total}</span>
        </div>
      </div>
    </div>
  );
};

export const PSSRReviewersApprovalsWidget: React.FC<PSSRReviewersApprovalsWidgetProps> = ({
  reviewers,
  approvers,
  sofApprovers = [],
  onSendReminder,
  onPersonClick,
  dragAttributes,
  dragListeners,
  pssrId,
  pssrTitle = 'PSSR',
  checklistCompletion,
  currentUserId,
  currentUserApproverId,
  currentUserRole,
  onApprove,
  onReject,
  approvalHistory = [],
  isApprovalLoading = false,
  pssrReason,
  plantName,
  facilityName,
  projectName,
}) => {
  const { widgetSize } = useWidgetSize();
  const widgetId = 'pssr-reviewers-approvals';
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);

  // Calculate stage completion
  const checklistComplete = !checklistCompletion || checklistCompletion.percentage === 100;
  const reviewersComplete = reviewers.every(r => r.pendingTasks === 0 || r.status === 'completed');
  const approversComplete = approvers.every(a => a.pendingTasks === 0 || a.status === 'completed');

  // Determine current stage and locked states
  // PSSR Approval requires BOTH checklist complete AND review stage complete
  const pssrApprovalLocked = !checklistComplete || !reviewersComplete;
  const sofApprovalLocked = !approversComplete || pssrApprovalLocked;
  
  // Determine the lock reason for PSSR approval
  const pssrApprovalLockReason = !checklistComplete 
    ? "Complete the checklist (100%) to unlock PSSR approval"
    : !reviewersComplete 
      ? "Complete the review stage to unlock PSSR approval"
      : undefined;
  
  const currentStage = !reviewersComplete ? 'review' : 
                       !approversComplete ? 'pssr-approval' : 
                       'sof-approval';

  // Check if current user can approve
  const canApprove = currentUserApproverId && onApprove && onReject && !pssrApprovalLocked;

  const widgetContent = (
    <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-4">
      {/* Checklist Completion Banner */}
      {checklistCompletion && (
        <ChecklistCompletionBanner
          completionPercentage={checklistCompletion.percentage}
          totalItems={checklistCompletion.total}
          completedItems={checklistCompletion.completed}
        />
      )}

      {/* Review Stage */}
      {reviewers.length > 0 && (
        <StageSection
          title="Review Stage"
          icon={<Eye className="h-4 w-4" />}
          people={reviewers}
          isCurrentStage={currentStage === 'review'}
          isLocked={false}
          onSendReminder={onSendReminder}
          onPersonClick={onPersonClick}
        />
      )}

      {/* Visual Connector */}
      {reviewers.length > 0 && approvers.length > 0 && (
        <div className="flex justify-center py-1">
          <div className={`w-0.5 h-4 rounded-full ${
            reviewersComplete 
              ? 'bg-gradient-to-b from-green-500 to-green-500/30' 
              : 'bg-gradient-to-b from-border to-border/30'
          }`} />
        </div>
      )}

      {/* PSSR Approval Stage */}
      {approvers.length > 0 && (
        <StageSection
          title="PSSR Approval"
          icon={<CheckCircle2 className="h-4 w-4" />}
          people={approvers}
          isCurrentStage={currentStage === 'pssr-approval'}
          isLocked={pssrApprovalLocked}
          lockReason={pssrApprovalLockReason}
          onSendReminder={onSendReminder}
          onPersonClick={onPersonClick}
        />
      )}

      {/* Approval Action Panel - shown when current user can approve */}
      {canApprove && currentStage === 'pssr-approval' && (
        <ApprovalActionPanel
          pssrId={pssrId || ''}
          pssrTitle={pssrTitle}
          approverId={currentUserApproverId}
          approverRole={currentUserRole || 'Approver'}
          onApprove={async (comments) => {
            await onApprove(currentUserApproverId, comments);
          }}
          onReject={async (comments) => {
            await onReject(currentUserApproverId, comments);
          }}
          isLoading={isApprovalLoading}
          isLocked={pssrApprovalLocked}
          lockedReason="Complete the checklist to enable approval"
        />
      )}

      {/* Visual Connector */}
      {approvers.length > 0 && sofApprovers.length > 0 && (
        <div className="flex justify-center py-1">
          <div className={`w-0.5 h-4 rounded-full ${
            approversComplete 
              ? 'bg-gradient-to-b from-green-500 to-green-500/30' 
              : 'bg-gradient-to-b from-border to-border/30'
          }`} />
        </div>
      )}

      {/* SoF Approval Stage */}
      {sofApprovers.length > 0 && (
        <>
          <StageSection
            title="SoF Approval"
            icon={<ShieldCheck className="h-4 w-4" />}
            people={sofApprovers}
            isCurrentStage={currentStage === 'sof-approval'}
            isLocked={sofApprovalLocked}
            lockReason="Complete PSSR approval to unlock SoF approval"
            onSendReminder={onSendReminder}
            onPersonClick={onPersonClick}
          />
          
          {/* View SoF Certificate Button */}
          <div className="flex justify-center mt-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCertificatePreview(true)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              View SoF Certificate
            </Button>
          </div>
        </>
      )}

      {/* Approval History */}
      {approvalHistory.length > 0 && (
        <ApprovalHistoryPanel
          approvers={approvalHistory}
          title="Approval History"
        />
      )}

      {/* Progress Summary */}
      <ApprovalProgress 
        reviewers={reviewers} 
        approvers={approvers} 
        sofApprovers={sofApprovers}
        checklistComplete={checklistComplete}
      />
    </div>
  );

  return (
    <>
      <WidgetCard 
        title="Approval Workflow" 
        className={`min-h-[500px] md:min-h-[560px] lg:min-h-[600px] ${
          widgetSize === 'compact' ? 'h-[500px] md:h-[560px] lg:h-[600px]' :
          widgetSize === 'standard' ? 'h-[650px] md:h-[700px] lg:h-[750px]' :
          'h-[850px] md:h-[900px] lg:h-[950px]'
        }`}
        widgetId={widgetId}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        {widgetContent}
      </WidgetCard>

      {/* SoF Certificate Preview Modal */}
      <Dialog open={showCertificatePreview} onOpenChange={setShowCertificatePreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Statement of Fitness Certificate</DialogTitle>
          </DialogHeader>
          <SOFCertificate
            certificateNumber={(() => {
              if (!pssrId) return 'SOF-DRAFT';
              const year = new Date().getFullYear();
              const numericPart = pssrId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
              return `SOF-${year}-${numericPart}`;
            })()}
            pssrReason={pssrReason || 'Standard PSSR'}
            plantName={plantName}
            facilityName={facilityName}
            projectName={projectName}
            approvers={sofApprovers.map((a, index) => ({
              id: a.id,
              approver_name: a.name,
              approver_role: a.role,
              approver_level: a.order || index + 1,
              status: sofApprovalLocked ? 'LOCKED' : (a.status === 'completed' ? 'APPROVED' : 'PENDING'),
              comments: a.comments,
              approved_at: a.completedAt,
              signature_data: undefined,
            }))}
            status={sofApprovalLocked ? 'LOCKED' : 'DRAFT'}
          />
        </DialogContent>
      </Dialog>

      <FullscreenWidgetModal widgetId={widgetId} title="Approval Workflow">
        {widgetContent}
      </FullscreenWidgetModal>
    </>
  );
};
