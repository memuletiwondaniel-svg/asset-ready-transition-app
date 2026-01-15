import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronRight } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface PSSRTaskCardProps {
  pssrId: string;
  pssrLabel: string;
  projectId: string;
  projectName: string;
  itemsAwaitingReview: number;
  pendingSince: string;
  onClick: () => void;
}

export const PSSRTaskCard: React.FC<PSSRTaskCardProps> = ({
  pssrId,
  pssrLabel,
  projectId,
  projectName,
  itemsAwaitingReview,
  pendingSince,
  onClick,
}) => {
  const daysPending = differenceInDays(new Date(), new Date(pendingSince));

  const getDaysColor = () => {
    if (daysPending < 3) return 'bg-muted text-muted-foreground';
    if (daysPending < 7) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
  };

  const getDaysText = () => {
    if (daysPending === 0) return 'Today';
    if (daysPending === 1) return '1 day';
    return `${daysPending} days`;
  };

  return (
    <Card 
      className="group hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-4">
          {/* PSSR Badge */}
          <Badge 
            variant="outline" 
            className="shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/30"
          >
            PSSR
          </Badge>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-foreground">{pssrLabel}</span>
              <span className="text-muted-foreground">•</span>
              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                {pssrId}
              </code>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              <span className="font-medium">{projectId}</span>
              {projectName && ` - ${projectName}`}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Items awaiting review */}
            <div className="text-center">
              <span className="text-lg font-bold text-primary">{itemsAwaitingReview}</span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Items</p>
            </div>

            {/* Days in queue */}
            <Badge variant="outline" className={`gap-1 ${getDaysColor()}`}>
              <Clock className="h-3 w-3" />
              {getDaysText()}
            </Badge>

            {/* Chevron indicator */}
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PSSRTaskCard;
