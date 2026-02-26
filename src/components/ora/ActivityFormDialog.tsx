import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Layers, FileText, ArrowRight, Loader2, Hash } from 'lucide-react';
import { ORAActivity, ORAActivityInput, ORPPhase, getDescendantIds } from '@/hooks/useORAActivityCatalog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingActivity: ORAActivity | null;
  phases: ORPPhase[];
  activities: ORAActivity[];
  onSave: (data: ORAActivityInput) => Promise<void>;
  isSaving: boolean;
  defaultParentId?: string | null;
}

export const ActivityFormDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  editingActivity,
  phases,
  activities,
  onSave,
  isSaving,
  defaultParentId,
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
    if (editingActivity) {
      setFormData({
        activity: editingActivity.activity,
        description: editingActivity.description || '',
        phase_id: editingActivity.phase_id || '',
        parent_activity_id: editingActivity.parent_activity_id || null,
        duration_high: editingActivity.duration_high || undefined,
        duration_med: editingActivity.duration_med || undefined,
        duration_low: editingActivity.duration_low || undefined,
      });
    } else {
      const parentActivity = defaultParentId ? activities.find(a => a.id === defaultParentId) : null;
      setFormData({
        activity: '',
        description: '',
        phase_id: parentActivity?.phase_id || '',
        parent_activity_id: defaultParentId || null,
        duration_high: undefined,
        duration_med: undefined,
        duration_low: undefined,
      });
    }
  }, [editingActivity, open, defaultParentId, activities]);

  // Auto-inherit phase when parent changes
  useEffect(() => {
    if (!editingActivity && formData.parent_activity_id) {
      const parent = activities.find(a => a.id === formData.parent_activity_id);
      if (parent?.phase_id) {
        setFormData(f => ({ ...f, phase_id: parent.phase_id || '' }));
      }
    }
  }, [formData.parent_activity_id, activities, editingActivity]);

  const handleSave = async () => {
    const payload = { ...formData };
    if (!payload.phase_id) delete payload.phase_id;
    if (!payload.parent_activity_id) payload.parent_activity_id = null;
    await onSave(payload);
  };

  // Filter parent options: exclude self and descendants
  const excludedIds = useMemo(() => {
    if (!editingActivity) return new Set<string>();
    const descendants = getDescendantIds(editingActivity.id, activities);
    descendants.add(editingActivity.id);
    return descendants;
  }, [editingActivity, activities]);

  const parentOptions = activities.filter(a => !excludedIds.has(a.id));

  // Preview code that will be generated
  const codePreview = useMemo(() => {
    if (editingActivity) return editingActivity.activity_code;
    if (!formData.parent_activity_id) return null;
    const parent = activities.find(a => a.id === formData.parent_activity_id);
    if (!parent) return null;
    const siblingCount = activities.filter(a => a.parent_activity_id === formData.parent_activity_id).length;
    return `${parent.activity_code}.${String(siblingCount + 1).padStart(2, '0')}`;
  }, [formData.parent_activity_id, activities, editingActivity]);

  const getPhaseColor = (code: string) => {
    const colors: Record<string, string> = {
      IDENTIFY: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
      ASSESS: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
      SELECT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
      DEFINE: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20',
      EXECUTE: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20',
      OPERATE: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
    };
    return colors[code] || 'bg-muted text-muted-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/15 border border-primary/20">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  {editingActivity ? 'Edit Activity' : formData.parent_activity_id ? 'New Sub-Activity' : 'New Activity'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {editingActivity
                    ? `Editing ${editingActivity.activity_code}`
                    : formData.parent_activity_id
                      ? `Adding sub-activity under ${activities.find(a => a.id === formData.parent_activity_id)?.activity_code || ''}`
                      : 'Define a new activity for the ORA catalog'}
                </p>
              </div>
            </div>
          </DialogHeader>
          {(editingActivity || codePreview) && (
            <Badge variant="outline" className="mt-3 font-mono text-xs bg-background/80 backdrop-blur-sm">
              <Hash className="h-3 w-3 mr-1" />
              {editingActivity ? editingActivity.activity_code : codePreview}
            </Badge>
          )}
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Activity Name */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activity Name
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              value={formData.activity}
              onChange={e => setFormData(f => ({ ...f, activity: e.target.value }))}
              placeholder="e.g. Pre-Startup Safety Review"
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              placeholder="Briefly describe the purpose and scope of this activity..."
              rows={6}
              className="resize-none"
            />
          </div>

          <Separator />

          {/* Phase & Parent — side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Phase
              </Label>
              <Select
                value={formData.phase_id || 'none'}
                onValueChange={v => setFormData(f => ({ ...f, phase_id: v === 'none' ? '' : v }))}
                disabled={!!formData.parent_activity_id}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No phase</span>
                  </SelectItem>
                  {phases.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <Badge variant="outline" className={`text-[11px] px-2 py-0 font-medium ${getPhaseColor(p.code)}`}>
                        {p.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.parent_activity_id && (
                <p className="text-[11px] text-muted-foreground">Inherited from parent</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                Parent Activity
              </Label>
              <Select
                value={formData.parent_activity_id || 'none'}
                onValueChange={v => setFormData(f => ({ ...f, parent_activity_id: v === 'none' ? null : v }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No parent</span>
                  </SelectItem>
                  {parentOptions.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-mono text-xs text-muted-foreground mr-1.5">{a.activity_code}</span>
                      {a.activity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Duration Estimates */}
          <div className="space-y-3">
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
                    onChange={e =>
                      setFormData(f => ({
                        ...f,
                        [key]: e.target.value ? parseInt(e.target.value) : undefined,
                      }))
                    }
                    placeholder="0"
                    className="h-10 text-center text-lg font-semibold border-0 bg-transparent shadow-none focus-visible:ring-0 p-0"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-muted/30 border-t">
          {!editingActivity && (
            <p className="text-xs text-muted-foreground">
              {codePreview ? `Code: ${codePreview}` : 'Code will be auto-generated on save'}
            </p>
          )}
          {editingActivity && <div />}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.activity || isSaving}
              className="px-5 min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingActivity ? (
                'Update Activity'
              ) : (
                'Add Activity'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
