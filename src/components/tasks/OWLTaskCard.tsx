import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  AlertTriangle, 
  PlayCircle, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { differenceInDays, format, isPast, isToday } from 'date-fns';
import { UserOWLItem, OWLStatus } from '@/hooks/useUserOWLItems';

interface OWLTaskCardProps {
  item: UserOWLItem;
  onClick: () => void;
  onUpdateStatus: (id: string, status: OWLStatus) => void;
  isUpdating?: boolean;
}

const sourceColors: Record<string, string> = {
  PUNCHLIST: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  PSSR: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  PAC: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200',
  FAC: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
};

const priorityColors: Record<number, string> = {
  1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  2: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  3: 'bg-muted text-muted-foreground',
};

const statusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  CLOSED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export const OWLTaskCard: React.FC<OWLTaskCardProps> = ({
  item,
  onClick,
  onUpdateStatus,
  isUpdating,
}) => {
  const isOverdue = item.due_date && isPast(new Date(item.due_date)) && !isToday(new Date(item.due_date));
  const isDueToday = item.due_date && isToday(new Date(item.due_date));
  const daysUntilDue = item.due_date ? differenceInDays(new Date(item.due_date), new Date()) : null;

  const getDueDateDisplay = () => {
    if (!item.due_date) return null;
    
    if (isOverdue) {
      const daysOverdue = Math.abs(daysUntilDue || 0);
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 gap-1">
          <AlertTriangle className="h-3 w-3" />
          {daysOverdue}d overdue
        </Badge>
      );
    }
    
    if (isDueToday) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 gap-1">
          <Clock className="h-3 w-3" />
          Due today
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="gap-1">
        <Calendar className="h-3 w-3" />
        {format(new Date(item.due_date), 'MMM d')}
      </Badge>
    );
  };

  const handleQuickAction = (e: React.MouseEvent, status: OWLStatus) => {
    e.stopPropagation();
    onUpdateStatus(item.id, status);
  };

  return (
    <Card 
      className={`hover:bg-muted/50 transition-colors cursor-pointer ${isOverdue ? 'border-red-300 dark:border-red-800' : ''}`}
      onClick={onClick}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-4">
          {/* Source Badge */}
          <Badge variant="outline" className={`shrink-0 ${sourceColors[item.source] || ''}`}>
            {item.source === 'PUNCHLIST' ? 'PUNCH' : item.source}
          </Badge>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">{item.item_number}</span>
              <span className="font-medium truncate">{item.title}</span>
              {item.priority && item.priority <= 2 && (
                <Badge variant="secondary" className={`text-xs shrink-0 ${priorityColors[item.priority] || ''}`}>
                  P{item.priority}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {item.project?.code ? `${item.project.code} - ` : ''}{item.project?.name || 'No Project'}
              {item.action_role?.name && ` • ${item.action_role.name}`}
            </p>
          </div>

          {/* Status & Due Date */}
          <div className="flex items-center gap-3 shrink-0">
            {getDueDateDisplay()}
            
            <Badge variant="outline" className={statusColors[item.status] || ''}>
              {item.status.replace('_', ' ')}
            </Badge>
            
            {/* Quick Actions */}
            {item.status === 'OPEN' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => handleQuickAction(e, 'IN_PROGRESS')}
                disabled={isUpdating}
                className="gap-1"
              >
                <PlayCircle className="h-3 w-3" />
                Start
              </Button>
            )}
            
            {item.status === 'IN_PROGRESS' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => handleQuickAction(e, 'CLOSED')}
                disabled={isUpdating}
                className="gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OWLTaskCard;
