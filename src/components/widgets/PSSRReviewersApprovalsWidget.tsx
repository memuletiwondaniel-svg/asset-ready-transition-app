import React from 'react';
import { WidgetCard } from './WidgetCard';
import { FullscreenWidgetModal } from './FullscreenWidgetModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Eye, Bell, ChevronRight, ShieldCheck } from 'lucide-react';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';

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
}

interface PSSRReviewersApprovalsWidgetProps {
  reviewers: ApprovalPerson[];
  approvers: ApprovalPerson[];
  sofApprovers?: ApprovalPerson[];
  onSendReminder?: (personId: string) => void;
  onPersonClick?: (personId: string) => void;
  dragAttributes?: any;
  dragListeners?: any;
}

const PersonApprovalCard: React.FC<{
  person: ApprovalPerson;
  isCurrentAction: boolean;
  isNextInQueue: boolean;
  onSendReminder?: (personId: string) => void;
  onPersonClick?: (personId: string) => void;
}> = ({ person, isCurrentAction, isNextInQueue, onSendReminder, onPersonClick }) => {
  const initials = person.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  // Determine status based on pendingTasks or explicit status
  const status = person.status || (person.pendingTasks === 0 ? 'completed' : 'in_progress');

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'in_progress': return <div className="w-2 h-2 rounded-full bg-primary" />;
      case 'waiting': return <div className="w-2 h-2 rounded-full border border-muted-foreground/50" />;
      default: return <div className="w-2 h-2 rounded-full border border-muted-foreground/50" />;
    }
  };

  const getStatusText = () => {
    if (status === 'completed') {
      return person.completedAt ? `Completed ${person.completedAt}` : 'Completed';
    }
    if (status === 'waiting') {
      return 'Waiting';
    }
    return `${person.pendingTasks} pending`;
  };

  return (
    <div
      onClick={() => onPersonClick?.(person.id)}
      className={`
        relative flex items-center gap-3 p-3 rounded-lg 
        border border-border/40 
        ${isCurrentAction ? 'bg-primary/5 border-primary/30' : 'bg-card/50'}
        ${status === 'completed' ? 'opacity-60' : ''}
        hover:bg-accent/10 hover:border-primary/30 
        transition-all cursor-pointer group
      `}
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 border border-border/50">
        <AvatarImage src={person.avatar} alt={person.name} />
        <AvatarFallback className="bg-muted text-muted-foreground font-medium text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${status === 'completed' ? 'text-muted-foreground' : 'text-foreground'}`}>
            {person.name}
          </p>
          {isCurrentAction && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
              ACTION
            </Badge>
          )}
          {isNextInQueue && !isCurrentAction && (
            <span className="text-[10px] text-muted-foreground">Next</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{person.role}</p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className="text-[11px] text-muted-foreground">{getStatusText()}</span>
      </div>

      {/* Actions */}
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
    </div>
  );
};

const StageSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  people: ApprovalPerson[];
  isCurrentStage: boolean;
  onSendReminder?: (personId: string) => void;
  onPersonClick?: (personId: string) => void;
}> = ({ title, icon, people, isCurrentStage, onSendReminder, onPersonClick }) => {
  // Find the first person with pending tasks (action needed)
  const currentActionIndex = people.findIndex(p => p.pendingTasks > 0);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-md ${isCurrentStage ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {icon}
        </div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
          {people.filter(p => p.pendingTasks === 0).length}/{people.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {people.map((person, index) => (
          <PersonApprovalCard
            key={person.id}
            person={person}
            isCurrentAction={index === currentActionIndex && isCurrentStage}
            isNextInQueue={index === currentActionIndex + 1 && isCurrentStage}
            onSendReminder={onSendReminder}
            onPersonClick={onPersonClick}
          />
        ))}
      </div>
    </div>
  );
};

const ApprovalProgress: React.FC<{
  reviewers: ApprovalPerson[];
  approvers: ApprovalPerson[];
  sofApprovers?: ApprovalPerson[];
}> = ({ reviewers, approvers, sofApprovers = [] }) => {
  const allPeople = [...reviewers, ...approvers, ...sofApprovers];
  const completed = allPeople.filter(p => p.pendingTasks === 0).length;
  const total = allPeople.length;

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Workflow Progress</span>
        <div className="flex items-center gap-1.5">
          {allPeople.map((person, index) => (
            <div
              key={person.id}
              className={`w-2 h-2 rounded-full ${
                person.pendingTasks === 0 ? 'bg-muted-foreground' : 'bg-muted-foreground/20'
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
}) => {
  const { widgetSize } = useWidgetSize();
  const widgetId = 'pssr-reviewers-approvals';

  // Determine current stage based on pending tasks
  const reviewersComplete = reviewers.every(r => r.pendingTasks === 0);
  const approversComplete = approvers.every(a => a.pendingTasks === 0);
  const currentStage = !reviewersComplete ? 'review' : !approversComplete ? 'pssr-approval' : 'sof-approval';

  const widgetContent = (
    <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-4">
      {/* Review Stage */}
      {reviewers.length > 0 && (
        <StageSection
          title="Review Stage"
          icon={<Eye className="h-4 w-4" />}
          people={reviewers}
          isCurrentStage={currentStage === 'review'}
          onSendReminder={onSendReminder}
          onPersonClick={onPersonClick}
        />
      )}

      {/* Visual Connector */}
      {reviewers.length > 0 && approvers.length > 0 && (
        <div className="flex justify-center py-1">
          <div className="w-0.5 h-4 bg-gradient-to-b from-border to-border/30 rounded-full" />
        </div>
      )}

      {/* PSSR Approval Stage */}
      {approvers.length > 0 && (
        <StageSection
          title="PSSR Approval"
          icon={<CheckCircle2 className="h-4 w-4" />}
          people={approvers}
          isCurrentStage={currentStage === 'pssr-approval'}
          onSendReminder={onSendReminder}
          onPersonClick={onPersonClick}
        />
      )}

      {/* Visual Connector */}
      {approvers.length > 0 && sofApprovers.length > 0 && (
        <div className="flex justify-center py-1">
          <div className="w-0.5 h-4 bg-gradient-to-b from-border to-border/30 rounded-full" />
        </div>
      )}

      {/* SoF Approval Stage */}
      {sofApprovers.length > 0 && (
        <StageSection
          title="SoF Approval"
          icon={<ShieldCheck className="h-4 w-4" />}
          people={sofApprovers}
          isCurrentStage={currentStage === 'sof-approval'}
          onSendReminder={onSendReminder}
          onPersonClick={onPersonClick}
        />
      )}

      {/* Progress Summary */}
      <ApprovalProgress reviewers={reviewers} approvers={approvers} sofApprovers={sofApprovers} />
    </div>
  );

  return (
    <>
      <WidgetCard 
        title="Approval" 
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

      <FullscreenWidgetModal widgetId={widgetId} title="Approval">
        {widgetContent}
      </FullscreenWidgetModal>
    </>
  );
};
