import React from 'react';
import { WidgetCard } from './WidgetCard';
import { FullscreenWidgetModal } from './FullscreenWidgetModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, Eye, Pause, Bell, ChevronRight } from 'lucide-react';
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
  
  const getBorderColor = () => {
    switch (status) {
      case 'completed': return 'border-l-green-500';
      case 'in_progress': return 'border-l-amber-500';
      case 'waiting': return 'border-l-muted';
      default: return 'border-l-muted';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'waiting': return <Pause className="h-4 w-4 text-muted-foreground" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    if (status === 'completed') {
      return person.completedAt ? `Completed ${person.completedAt}` : 'Completed';
    }
    if (status === 'waiting') {
      return 'Waiting for previous step';
    }
    return `${person.pendingTasks} item${person.pendingTasks !== 1 ? 's' : ''} pending`;
  };

  return (
    <div
      onClick={() => onPersonClick?.(person.id)}
      className={`
        relative flex items-center gap-3 p-3 rounded-lg 
        border-l-4 ${getBorderColor()} 
        border border-border/40 bg-card/50
        hover:bg-accent/10 hover:border-primary/30 
        transition-all cursor-pointer group
      `}
    >
      {/* Avatar with online status */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
          <AvatarImage src={person.avatar} alt={person.name} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
            person.isOnline ? 'bg-green-500' : 'bg-muted-foreground/50'
          }`}
        />
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{person.name}</p>
          {isCurrentAction && (
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] px-1.5 py-0 animate-pulse">
              ACTION NEEDED
            </Badge>
          )}
          {isNextInQueue && !isCurrentAction && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/50 text-blue-600">
              NEXT
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{person.role}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {getStatusIcon()}
          <span className="text-[11px] text-muted-foreground">{getStatusText()}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {status === 'in_progress' && onSendReminder && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onSendReminder(person.id);
            }}
          >
            <Bell className="h-4 w-4" />
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
}> = ({ reviewers, approvers }) => {
  const allPeople = [...reviewers, ...approvers];
  const completed = allPeople.filter(p => p.pendingTasks === 0).length;
  const total = allPeople.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">Workflow Progress</span>
        <span className="text-xs font-semibold text-foreground">{completed}/{total} complete</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};

export const PSSRReviewersApprovalsWidget: React.FC<PSSRReviewersApprovalsWidgetProps> = ({
  reviewers,
  approvers,
  onSendReminder,
  onPersonClick,
  dragAttributes,
  dragListeners,
}) => {
  const { widgetSize } = useWidgetSize();
  const widgetId = 'pssr-reviewers-approvals';

  // Determine current stage based on pending tasks
  const reviewersComplete = reviewers.every(r => r.pendingTasks === 0);
  const currentStage = reviewersComplete ? 'approval' : 'review';

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

      {/* Approval Stage */}
      {approvers.length > 0 && (
        <StageSection
          title="Approval Stage"
          icon={<CheckCircle2 className="h-4 w-4" />}
          people={approvers}
          isCurrentStage={currentStage === 'approval'}
          onSendReminder={onSendReminder}
          onPersonClick={onPersonClick}
        />
      )}

      {/* Progress Summary */}
      <ApprovalProgress reviewers={reviewers} approvers={approvers} />
    </div>
  );

  return (
    <>
      <WidgetCard 
        title="Reviewers & Approvals" 
        className={`min-h-[280px] md:min-h-[300px] lg:min-h-[320px] ${
          widgetSize === 'compact' ? 'h-[280px] md:h-[300px] lg:h-[320px]' :
          widgetSize === 'standard' ? 'h-[350px] md:h-[380px] lg:h-[400px]' :
          'h-[450px] md:h-[500px] lg:h-[520px]'
        }`}
        widgetId={widgetId}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        {widgetContent}
      </WidgetCard>

      <FullscreenWidgetModal widgetId={widgetId} title="Reviewers & Approvals">
        {widgetContent}
      </FullscreenWidgetModal>
    </>
  );
};
