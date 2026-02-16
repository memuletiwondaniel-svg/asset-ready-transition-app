import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2 } from 'lucide-react';
import { WizardActivity, PROJECT_PHASES, PROJECT_TYPES } from './types';
import { format, parseISO } from 'date-fns';

interface Props {
  phase: string;
  projectType: string;
  activities: WizardActivity[];
}

export const StepReview: React.FC<Props> = ({ phase, projectType, activities }) => {
  const selectedActivities = activities.filter(a => a.selected);
  const phaseLabel = PROJECT_PHASES.find(p => p.value === phase)?.label || phase;
  const typeInfo = PROJECT_TYPES.find(t => t.value === projectType);
  const withDates = selectedActivities.filter(a => a.startDate || a.endDate).length;
  const withDeps = selectedActivities.filter(a => a.predecessorIds.length > 0).length;

  return (
    <div className="space-y-4 p-1">
      <div className="text-center space-y-2 pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Review & Create</h3>
        <p className="text-sm text-muted-foreground">
          Review your ORA Activity Plan before creating it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Project Phase</p>
            <p className="font-semibold mt-0.5">{phaseLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Project Type</p>
            <p className="font-semibold mt-0.5">{typeInfo?.label}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-2xl font-bold">{selectedActivities.length}</p>
          <p className="text-xs text-muted-foreground">Activities</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-2xl font-bold">{withDates}</p>
          <p className="text-xs text-muted-foreground">Scheduled</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-2xl font-bold">{withDeps}</p>
          <p className="text-xs text-muted-foreground">With Dependencies</p>
        </div>
      </div>

      <ScrollArea className="h-[200px]">
        <div className="space-y-2 pr-3">
          {selectedActivities.map((activity, index) => (
            <div key={activity.id} className="flex items-center gap-3 p-2.5 border rounded-lg">
              <span className="text-xs font-mono text-muted-foreground w-5">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.name}</p>
                <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                  {activity.startDate && (
                    <span>{format(parseISO(activity.startDate), 'dd MMM yyyy')}</span>
                  )}
                  {activity.startDate && activity.endDate && <span>→</span>}
                  {activity.endDate && (
                    <span>{format(parseISO(activity.endDate), 'dd MMM yyyy')}</span>
                  )}
                  {activity.durationDays && <span>• {activity.durationDays}d</span>}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">{activity.area}</Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
