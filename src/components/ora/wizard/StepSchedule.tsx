import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import { WizardActivity } from './types';

interface Props {
  activities: WizardActivity[];
  onActivitiesChange: (activities: WizardActivity[]) => void;
}

export const StepSchedule: React.FC<Props> = ({ activities, onActivitiesChange }) => {
  const selectedActivities = activities.filter(a => a.selected);

  const updateActivity = (id: string, updates: Partial<WizardActivity>) => {
    onActivitiesChange(
      activities.map(a => a.id === id ? { ...a, ...updates } : a)
    );
  };

  const toggleDependency = (activityId: string, predecessorId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;
    const newPredecessors = activity.predecessorIds.includes(predecessorId)
      ? activity.predecessorIds.filter(p => p !== predecessorId)
      : [...activity.predecessorIds, predecessorId];
    updateActivity(activityId, { predecessorIds: newPredecessors });
  };

  return (
    <div className="space-y-4 p-1">
      <div className="text-center space-y-2 pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Schedule & Dependencies</h3>
        <p className="text-sm text-muted-foreground">
          Set duration, dates, and link dependent activities.
        </p>
      </div>

      <ScrollArea className="h-[380px]">
        <div className="space-y-4 pr-3">
          {selectedActivities.map((activity, index) => (
            <div key={activity.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground w-6">{index + 1}.</span>
                <span className="font-medium text-sm flex-1">{activity.name}</span>
                <Badge variant="outline" className="text-[10px]">{activity.entryType}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Duration (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={activity.durationDays ?? ''}
                    onChange={(e) => updateActivity(activity.id, { durationDays: parseInt(e.target.value) || null })}
                    className="mt-1 h-8 text-sm"
                    placeholder="—"
                  />
                </div>
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={activity.startDate}
                    onChange={(e) => updateActivity(activity.id, { startDate: e.target.value })}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={activity.endDate}
                    onChange={(e) => updateActivity(activity.id, { endDate: e.target.value })}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Dependencies */}
              {selectedActivities.length > 1 && (
                <div>
                  <Label className="text-xs">Predecessors (depends on)</Label>
                  <Select
                    value=""
                    onValueChange={(val) => toggleDependency(activity.id, val)}
                  >
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue placeholder={
                        activity.predecessorIds.length > 0
                          ? `${activity.predecessorIds.length} predecessor(s)`
                          : "No dependencies"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedActivities
                        .filter(a => a.id !== activity.id && a.id)
                        .map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {activity.predecessorIds.includes(a.id) ? '✓ ' : ''}{a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {activity.predecessorIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {activity.predecessorIds.map(pid => {
                        const pred = selectedActivities.find(a => a.id === pid);
                        return pred ? (
                          <Badge
                            key={pid}
                            variant="secondary"
                            className="text-[10px] cursor-pointer"
                            onClick={() => toggleDependency(activity.id, pid)}
                          >
                            {pred.name} ✕
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
