import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Layers, ArrowRight, Loader2, Save, Trash2 } from 'lucide-react';
import { ORAActivity, ORAActivityInput, ORPPhase } from '@/hooks/useORAActivityCatalog';

interface Props {
  activity: ORAActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phases: ORPPhase[];
  activities: ORAActivity[];
  onSave: (payload: ORAActivityInput & { id: string }) => Promise<void>;
  onDelete: (id: string) => void;
  isSaving: boolean;
}

const getPhaseColor = (code: string) => {
  const colors: Record<string, string> = {
    IDENTIFY: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    ASSESS: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    SELECT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    DEFINE: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
    EXECUTE: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    OPERATE: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
  };
  return colors[code] || 'bg-muted text-muted-foreground border-muted';
};

export const ActivityDetailSheet: React.FC<Props> = ({
  activity,
  open,
  onOpenChange,
  phases,
  activities,
  onSave,
  onDelete,
  isSaving,
}) => {
  const [formData, setFormData] = useState<ORAActivityInput>({
    activity: '',
    description: '',
    phase_id: '',
    parent_activity_id: null,
    duration_high: undefined,
    duration_med: undefined,
    duration_low: undefined,
  });

  useEffect(() => {
    if (activity) {
      setFormData({
        activity: activity.activity,
        description: activity.description || '',
        phase_id: activity.phase_id || '',
        parent_activity_id: activity.parent_activity_id || null,
        duration_high: activity.duration_high ?? undefined,
        duration_med: activity.duration_med ?? undefined,
        duration_low: activity.duration_low ?? undefined,
      });
    }
  }, [activity]);

  const handleSave = async () => {
    if (!activity) return;
    const payload = { ...formData };
    if (!payload.phase_id) delete payload.phase_id;
    if (!payload.parent_activity_id) payload.parent_activity_id = null;
    await onSave({ id: activity.id, ...payload });
  };

  const phase = phases.find(p => p.id === activity?.phase_id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4 shrink-0">
          <SheetHeader>
            <div className="flex items-center gap-2 mb-1">
              {activity && (
                <Badge variant="outline" className={`font-mono text-xs whitespace-nowrap ${phase ? getPhaseColor(phase.code) : 'bg-muted text-muted-foreground'}`}>
                  {activity.activity_code}
                </Badge>
              )}
            </div>
            <SheetTitle className="text-lg leading-tight">{activity?.activity || 'Activity'}</SheetTitle>
            <SheetDescription className="sr-only">Edit activity details</SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Activity Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activity Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.activity}
              onChange={e => setFormData(f => ({ ...f, activity: e.target.value }))}
              className="h-10"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              rows={8}
              className="resize-none text-sm"
            />
          </div>

          <Separator />

          {/* Phase */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Phase
            </Label>
            <Select
              value={formData.phase_id || 'none'}
              onValueChange={v => setFormData(f => ({ ...f, phase_id: v === 'none' ? '' : v }))}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><span className="text-muted-foreground">No phase</span></SelectItem>
                  {phases.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <Badge variant="outline" className={`text-[11px] px-2 py-0 font-medium ${getPhaseColor(p.code)}`}>
                        {p.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>

          {/* Parent Activity */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />
              Parent Activity
            </Label>
            <Select
              value={formData.parent_activity_id || 'none'}
              onValueChange={v => setFormData(f => ({ ...f, parent_activity_id: v === 'none' ? null : v }))}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none"><span className="text-muted-foreground">No parent</span></SelectItem>
                {activities
                  .filter(a => a.id !== activity?.id)
                  .map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-mono text-xs text-muted-foreground mr-1.5">{a.activity_code}</span>
                      {a.activity}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Duration Estimates */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Duration Estimates
              <span className="text-[10px] font-normal normal-case">(days)</span>
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'duration_high' as const, label: 'High' },
                { key: 'duration_med' as const, label: 'Medium' },
                { key: 'duration_low' as const, label: 'Low' },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  className="relative rounded-lg border border-border bg-card p-3 text-center transition-all hover:border-primary/40 hover:bg-accent/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40"
                >
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</span>
                  <Input
                    type="number"
                    min={0}
                    value={formData[key] ?? ''}
                    onChange={e => setFormData(f => ({ ...f, [key]: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="0"
                    className="h-9 text-center text-lg font-semibold border-0 bg-transparent shadow-none focus-visible:ring-0 p-0"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-muted/30 border-t shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => activity && onDelete(activity.id)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.activity || isSaving}
            size="sm"
            className="min-w-[100px]"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-1.5" />Save</>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
