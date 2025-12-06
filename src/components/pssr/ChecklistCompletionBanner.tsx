import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface ChecklistCompletionBannerProps {
  completionPercentage: number;
  totalItems: number;
  completedItems: number;
  onComplete?: () => void;
}

export const ChecklistCompletionBanner: React.FC<ChecklistCompletionBannerProps> = ({
  completionPercentage,
  totalItems,
  completedItems,
}) => {
  const isComplete = completionPercentage === 100;
  const isNearComplete = completionPercentage >= 80 && completionPercentage < 100;

  return (
    <div className={`
      p-4 rounded-lg border mb-4 transition-all
      ${isComplete 
        ? 'bg-green-500/10 border-green-500/30' 
        : isNearComplete 
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-muted/50 border-border'
      }
    `}>
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-full
          ${isComplete 
            ? 'bg-green-500/20 text-green-600' 
            : isNearComplete 
              ? 'bg-amber-500/20 text-amber-600'
              : 'bg-muted text-muted-foreground'
          }
        `}>
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : isNearComplete ? (
            <Clock className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold text-sm ${
              isComplete ? 'text-green-700 dark:text-green-400' : 'text-foreground'
            }`}>
              {isComplete 
                ? 'Checklist Complete' 
                : isNearComplete 
                  ? 'Almost Complete'
                  : 'Checklist In Progress'
              }
            </h4>
            <span className="text-sm font-medium">
              {completedItems}/{totalItems} items
            </span>
          </div>
          
          <Progress 
            value={completionPercentage} 
            className={`h-2 ${
              isComplete 
                ? '[&>div]:bg-green-500' 
                : isNearComplete 
                  ? '[&>div]:bg-amber-500'
                  : ''
            }`}
          />
          
          <p className="text-xs text-muted-foreground">
            {isComplete 
              ? 'All checklist items have been completed. PSSR approval can now proceed.'
              : `${100 - completionPercentage}% remaining. Complete all items before PSSR approval can begin.`
            }
          </p>
        </div>
      </div>
    </div>
  );
};
