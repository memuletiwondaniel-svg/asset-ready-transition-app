import React from 'react';
import { WidgetCard } from './WidgetCard';
import { FullscreenWidgetModal } from './FullscreenWidgetModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';

interface Reviewer {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  pendingTasks: number;
  isOnline?: boolean;
}

interface PSSRPendingTasksWidgetProps {
  reviewers: Reviewer[];
  approvers: Reviewer[];
}

export const PSSRPendingTasksWidget: React.FC<PSSRPendingTasksWidgetProps> = ({
  reviewers,
  approvers
}) => {
  const { widgetSize } = useWidgetSize();
  const widgetId = 'pssr-pending-tasks';

  const renderPersonCard = (person: Reviewer) => {
    const initials = person.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    return (
      <div
        key={person.id}
        className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-accent/5 transition-all"
      >
        <div className="relative">
          <Avatar className="h-10 w-10 border-2 border-background">
            <AvatarImage src={person.avatar} alt={person.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* Teams status indicator */}
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
              person.isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{person.name}</p>
          <p className="text-xs text-muted-foreground truncate">{person.role}</p>
        </div>

        <Badge
          variant="outline"
          className={`${
            person.pendingTasks > 0
              ? 'bg-orange-100 text-orange-800 border-orange-200'
              : 'bg-green-100 text-green-800 border-green-200'
          }`}
        >
          {person.pendingTasks > 0 ? (
            <>
              <Circle className="h-3 w-3 mr-1 fill-current" />
              {person.pendingTasks}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Done
            </>
          )}
        </Badge>
      </div>
    );
  };

  const widgetContent = (
    <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-4">
      {reviewers.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Reviewers ({reviewers.length})
          </label>
          <div className="space-y-2">
            {reviewers.map(renderPersonCard)}
          </div>
        </div>
      )}

      {approvers.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Approvers ({approvers.length})
          </label>
          <div className="space-y-2">
            {approvers.map(renderPersonCard)}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <WidgetCard 
        title="Pending Activities" 
        className={`min-h-[280px] md:min-h-[300px] lg:min-h-[320px] ${
          widgetSize === 'compact' ? 'h-[280px] md:h-[300px] lg:h-[320px]' :
          widgetSize === 'standard' ? 'h-[350px] md:h-[380px] lg:h-[400px]' :
          'h-[450px] md:h-[500px] lg:h-[520px]'
        }`}
        widgetId={widgetId}
      >
        {widgetContent}
      </WidgetCard>

      <FullscreenWidgetModal widgetId={widgetId} title="Pending Activities">
        {widgetContent}
      </FullscreenWidgetModal>
    </>
  );
};
