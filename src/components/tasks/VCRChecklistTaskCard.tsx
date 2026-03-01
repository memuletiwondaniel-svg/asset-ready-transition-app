import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, ExternalLink, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VCRBundleTask, VCRSubItem } from '@/hooks/useUserVCRBundleTasks';
import { Clock } from 'lucide-react';

interface VCRChecklistTaskCardProps {
  task: VCRBundleTask;
  compact?: boolean;
}

const getProgressColor = (pct: number) => {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 25) return 'bg-amber-500';
  return 'bg-red-500';
};

export const VCRChecklistTaskCard: React.FC<VCRChecklistTaskCardProps> = ({ task, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const isWaiting = task.status === 'waiting';
  const completedCount = task.sub_items.filter(i => i.completed).length;
  const totalCount = task.sub_items.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const itemsReady = (task.metadata as any)?.items_ready_for_review ?? 0;

  const handleNavigateToVCR = () => {
    const vcrId = task.metadata?.vcr_id;
    if (vcrId) {
      navigate(`/p2a-handover?vcr=${vcrId}`);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 min-w-0">
          <Progress
            value={pct}
            className="h-2"
            indicatorClassName={getProgressColor(pct)}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {completedCount}/{totalCount}
        </span>
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", isWaiting && "opacity-50")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">{task.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {task.metadata?.vcr_label || 'VCR'}
            </p>
          </div>
          {isWaiting ? (
            <Badge variant="outline" className="text-xs shrink-0 gap-1 bg-muted/50 text-muted-foreground border-border">
              <Clock className="h-3 w-3" />
              Awaiting
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={cn(
                'text-xs shrink-0',
                pct >= 75 && 'bg-green-500/10 text-green-600 border-green-500/20',
                pct >= 25 && pct < 75 && 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                pct < 25 && 'bg-red-500/10 text-red-600 border-red-500/20'
              )}
            >
              {pct}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Progress bar or waiting indicator */}
        {isWaiting ? (
          <div className="space-y-1.5">
            <div className="h-2.5 w-full rounded-full bg-muted" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="italic">Waiting for deliverables</span>
              <span>{itemsReady}/{totalCount} ready</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Progress
              value={pct}
              className="h-2.5"
              indicatorClassName={getProgressColor(pct)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedCount}/{totalCount} items completed</span>
              <span>{pct}%</span>
            </div>
          </div>
        )}

        {/* Expandable mini-checklist */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2">
              <span className="flex items-center gap-1.5 text-xs">
                <ClipboardList className="h-3.5 w-3.5" />
                View checklist items
              </span>
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1">
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border p-2">
              {task.sub_items.map((item: VCRSubItem) => (
                <div
                  key={item.prerequisite_id}
                  className={cn(
                    'flex items-start gap-2 text-xs py-1.5 px-1 rounded',
                    item.completed && 'opacity-60'
                  )}
                >
                  {item.completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <span className={cn(item.completed && 'line-through')}>
                    {item.summary}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Navigate to VCR */}
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs gap-1.5"
          onClick={handleNavigateToVCR}
          disabled={isWaiting}
        >
          {isWaiting ? 'Not yet actionable' : 'Open VCR'}
          <ExternalLink className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};
