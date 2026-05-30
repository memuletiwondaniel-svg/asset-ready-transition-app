import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  ListFilter,
  PenLine,
  Rocket,
  Layers,
  ClipboardList,
  Table2,
  LayoutGrid,
  LayoutTemplate,
} from 'lucide-react';
import { ORAActivityCatalog } from '@/components/ora/ORAActivityCatalog';
import { ORATemplateManagement } from '@/components/ora/ORATemplateManagement';
import { cn } from '@/lib/utils';
import { useORAActivityCatalog, useORPPhases, ORAActivity, ORAActivityInput } from '@/hooks/useORAActivityCatalog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type PhaseStyle = {
  icon: React.ReactNode;
  iconText: string;
  iconBg: string;
  hoverBg: string;
  hoverBorder: string;
};

const PHASE_STYLES: Record<string, PhaseStyle> = {
  ASSESS: {
    icon: <Search className="h-5 w-5" />,
    iconText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/10',
    hoverBg: 'hover:bg-amber-500/5',
    hoverBorder: 'hover:border-amber-300/60 dark:hover:border-amber-700/60',
  },
  SELECT: {
    icon: <ListFilter className="h-5 w-5" />,
    iconText: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/10',
    hoverBg: 'hover:bg-purple-500/5',
    hoverBorder: 'hover:border-purple-300/60 dark:hover:border-purple-700/60',
  },
  DEFINE: {
    icon: <PenLine className="h-5 w-5" />,
    iconText: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-500/10',
    hoverBg: 'hover:bg-teal-500/5',
    hoverBorder: 'hover:border-teal-300/60 dark:hover:border-teal-700/60',
  },
  EXECUTE: {
    icon: <Rocket className="h-5 w-5" />,
    iconText: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/10',
    hoverBg: 'hover:bg-blue-500/5',
    hoverBorder: 'hover:border-blue-300/60 dark:hover:border-blue-700/60',
  },
};

const VISIBLE_PHASE_CODES = ['ASSESS', 'SELECT', 'DEFINE', 'EXECUTE'];

// Display activity_code as <Letter>.<NN> with 2-digit padding (A.01, S.03, D.11, E.23).
// Handles both new short codes ("A.01", "S-3") and legacy prefixed codes ("ASS-01", "SEL-3").
const PREFIX_TO_LETTER: Record<string, string> = {
  ASS: 'A', SEL: 'S', DEF: 'D', EXE: 'E', IDN: 'I', OPR: 'O',
};
function formatActivityCode(code: string): string {
  if (!code) return '';
  const long = code.match(/^(ASS|SEL|DEF|EXE|IDN|OPR)[.\-]?(\d+)$/i);
  if (long) {
    const letter = PREFIX_TO_LETTER[long[1].toUpperCase()];
    return `${letter}.${long[2].padStart(2, '0')}`;
  }
  const short = code.match(/^([A-Z])[.\-]?(\d+)$/i);
  if (short) return `${short[1].toUpperCase()}.${short[2].padStart(2, '0')}`;
  return code;
}


export const ORPPhaseDeliverablesTab = () => {
  const { activities, isLoading, createActivity, updateActivity, deleteActivity, isCreating, isUpdating } = useORAActivityCatalog();
  const { phases } = useORPPhases();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Combined Add dialog (Activity or Phase)
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<'activity' | 'phase'>('activity');

  // Activity form
  const [editingActivity, setEditingActivity] = useState<ORAActivity | null>(null);
  const [activityForm, setActivityForm] = useState<ORAActivityInput>({
    activity: '',
    description: '',
    phase_id: '',
    duration_high: undefined,
    duration_med: undefined,
    duration_low: undefined,
  });

  // View-only activity
  const [viewingActivity, setViewingActivity] = useState<ORAActivity | null>(null);

  // Phase form
  const [phaseForm, setPhaseForm] = useState({ code: '', label: '', prefix: '' });
  const [isCreatingPhase, setIsCreatingPhase] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const visiblePhases = phases.filter((p) => VISIBLE_PHASE_CODES.includes(p.code));

  // Group activities by phase
  const activitiesByPhase = activities.reduce((acc, activity) => {
    const phaseId = activity.phase_id || 'unassigned';
    if (!acc[phaseId]) acc[phaseId] = [];
    acc[phaseId].push(activity);
    return acc;
  }, {} as Record<string, ORAActivity[]>);

  const resetActivityForm = () => {
    setEditingActivity(null);
    setActivityForm({ activity: '', description: '', phase_id: '', duration_high: undefined, duration_med: undefined, duration_low: undefined });
  };

  const openAdd = (presetPhaseId?: string) => {
    resetActivityForm();
    setPhaseForm({ code: '', label: '', prefix: '' });
    setAddType('activity');
    if (presetPhaseId) {
      setActivityForm((p) => ({ ...p, phase_id: presetPhaseId }));
    }
    setAddOpen(true);
  };

  const openEditActivity = (activity: ORAActivity) => {
    setEditingActivity(activity);
    setActivityForm({
      activity: activity.activity,
      description: activity.description || '',
      phase_id: activity.phase_id || '',
      parent_activity_id: activity.parent_activity_id || null,
      duration_high: activity.duration_high || undefined,
      duration_med: activity.duration_med || undefined,
      duration_low: activity.duration_low || undefined,
    });
    setAddType('activity');
    setAddOpen(true);
  };

  const openViewActivity = (activity: ORAActivity) => {
    setViewingActivity(activity);
  };

  const handleSaveActivity = async () => {
    try {
      const payload = { ...activityForm };
      if (!payload.phase_id) delete payload.phase_id;
      if (editingActivity) {
        await updateActivity({ id: editingActivity.id, ...payload });
      } else {
        await createActivity(payload);
      }
      setAddOpen(false);
      resetActivityForm();
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const handleSavePhase = async () => {
    if (!phaseForm.code || !phaseForm.label || !phaseForm.prefix) return;
    try {
      setIsCreatingPhase(true);
      const nextOrder = (phases.length || 0) + 1;
      const { error } = await supabase.from('orp_phases').insert({
        code: phaseForm.code.toUpperCase(),
        label: phaseForm.label,
        prefix: phaseForm.prefix.toUpperCase(),
        display_order: nextOrder,
        is_active: true,
      });
      if (error) throw error;
      toast({ title: 'Phase created', description: `${phaseForm.label} has been added.` });
      queryClient.invalidateQueries({ queryKey: ['orp-phases'] });
      setAddOpen(false);
      setPhaseForm({ code: '', label: '', prefix: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreatingPhase(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteActivity(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const filterActivities = (acts: ORAActivity[]) => {
    if (!searchQuery) return acts;
    const query = searchQuery.toLowerCase();
    return acts.filter(
      (a) =>
        a.activity.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.activity_code.toLowerCase().includes(query)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading ORP phases...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-80"
          />
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                  onClick={() => setViewMode((v) => (v === 'cards' ? 'table' : 'cards'))}
                  aria-label="Toggle view"
                >
                  {viewMode === 'cards' ? <Table2 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{viewMode === 'cards' ? 'Switch to table view' : 'Switch to card view'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 transition-colors hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-400/50"
                  onClick={() => setTemplatesOpen(true)}
                  aria-label="Templates"
                >
                  <LayoutTemplate className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Templates</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={() => openAdd()} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Deliverables
          </Button>
        </div>
      </div>


      {viewMode === 'table' ? (
        <ORAActivityCatalog hideToolbar externalSearch={searchQuery} />
      ) : (
      <Accordion type="multiple" className="space-y-3">
        {visiblePhases.map((phase) => {
          const style = PHASE_STYLES[phase.code] ?? PHASE_STYLES.ASSESS;
          const phaseActivities = filterActivities(activitiesByPhase[phase.id] || []);
          const totalCount = (activitiesByPhase[phase.id] || []).length;

          return (
            <AccordionItem
              key={phase.id}
              value={phase.id}
              className={cn(
                'group/phase border rounded-lg bg-card/50 overflow-hidden transition-colors duration-200',
                style.hoverBorder
              )}
            >
              <AccordionTrigger className={cn('px-4 py-3 hover:no-underline transition-colors', style.hoverBg)}>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                      style.iconBg,
                      style.iconText
                    )}
                  >
                    {style.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">{phase.label} Phase</h3>
                    <p className="text-xs text-muted-foreground">
                      {totalCount} {totalCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {phaseActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No deliverables in this phase</p>
                    <Button variant="link" className="mt-2" onClick={() => openAdd(phase.id)}>
                      Add the first one
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">ID</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead className="w-20 text-center">High</TableHead>
                        <TableHead className="w-20 text-center">Med</TableHead>
                        <TableHead className="w-20 text-center">Low</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="group/tbody">
                      {phaseActivities.map((activity) => (
                        <TableRow
                          key={activity.id}
                          className="group/row transition-all duration-200 group-hover/tbody:opacity-40 hover:!opacity-100 hover:bg-muted/60 cursor-pointer"
                          onClick={() => openViewActivity(activity)}
                        >
                          <TableCell className="font-mono text-xs">
                            {formatActivityCode(activity.activity_code)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{activity.activity}</p>
                              {activity.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{activity.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{activity.duration_high ?? '-'}</TableCell>
                          <TableCell className="text-center">{activity.duration_med ?? '-'}</TableCell>
                          <TableCell className="text-center">{activity.duration_low ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditActivity(activity);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(activity.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      )}

      {/* Templates overlay */}
      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent hideCloseButton className="max-w-5xl w-[90vw] h-[85vh] max-h-[85vh] overflow-y-auto scrollbar-auto-hide">
          <DialogHeader className="sr-only">
            <DialogTitle>ORA Plan Templates</DialogTitle>
            <DialogDescription>Manage reusable ORA plan templates.</DialogDescription>
          </DialogHeader>
          <ORATemplateManagement />
        </DialogContent>
      </Dialog>


      {/* Combined Add Dialog (Activity or Phase) */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) {
            resetActivityForm();
            setPhaseForm({ code: '', label: '', prefix: '' });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden flex flex-col h-[640px] max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 space-y-1 flex-shrink-0">
            <DialogTitle className="text-xl font-semibold">
              {editingActivity ? 'Edit Activity' : 'Add New'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editingActivity
                ? 'Update the details for this activity.'
                : 'Add an activity to an ORP phase, or create a new ORP phase.'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-5 border-t border-border/60 pt-5 flex-1 overflow-y-auto min-h-0">
            {!editingActivity && (
              <div className="space-y-2">
                <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                  Type
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        key: 'activity',
                        label: 'Activity',
                        icon: <ClipboardList className="h-5 w-5" />,
                        activeCls: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                        hoverCls: 'hover:border-emerald-300 hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-400',
                      },
                      {
                        key: 'phase',
                        label: 'ORP Phase',
                        icon: <Layers className="h-5 w-5" />,
                        activeCls: 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400',
                        hoverCls: 'hover:border-violet-300 hover:bg-violet-500/5 hover:text-violet-600 dark:hover:text-violet-400',
                      },
                    ] as const
                  ).map((opt) => {
                    const active = addType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setAddType(opt.key)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 transition-all',
                          active
                            ? opt.activeCls
                            : cn('border-border bg-background text-muted-foreground', opt.hoverCls)
                        )}
                      >
                        {opt.icon}
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {addType === 'activity' || editingActivity ? (
              <>
                {editingActivity && (
                  <div className="space-y-2">
                    <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                      Activity ID
                    </Label>
                    <Input value={formatActivityCode(editingActivity.activity_code)} disabled className="bg-muted font-mono" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    Phase
                  </Label>
                  <Select
                    value={activityForm.phase_id || ''}
                    onValueChange={(value) => setActivityForm((prev) => ({ ...prev, phase_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {visiblePhases.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    Activity *
                  </Label>
                  <Input
                    value={activityForm.activity}
                    onChange={(e) => setActivityForm((prev) => ({ ...prev, activity: e.target.value }))}
                    placeholder="Activity name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    Description — optional
                  </Label>
                  <Textarea
                    value={activityForm.description}
                    onChange={(e) => setActivityForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                      High (days)
                    </Label>
                    <Input
                      type="number"
                      value={activityForm.duration_high ?? ''}
                      onChange={(e) =>
                        setActivityForm((prev) => ({
                          ...prev,
                          duration_high: e.target.value ? parseInt(e.target.value) : undefined,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                      Med (days)
                    </Label>
                    <Input
                      type="number"
                      value={activityForm.duration_med ?? ''}
                      onChange={(e) =>
                        setActivityForm((prev) => ({
                          ...prev,
                          duration_med: e.target.value ? parseInt(e.target.value) : undefined,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                      Low (days)
                    </Label>
                    <Input
                      type="number"
                      value={activityForm.duration_low ?? ''}
                      onChange={(e) =>
                        setActivityForm((prev) => ({
                          ...prev,
                          duration_low: e.target.value ? parseInt(e.target.value) : undefined,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    Phase Label *
                  </Label>
                  <Input
                    value={phaseForm.label}
                    onChange={(e) => setPhaseForm((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., Commission"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                      Code *
                    </Label>
                    <Input
                      value={phaseForm.code}
                      onChange={(e) => setPhaseForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g., COMMISSION"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                      Prefix *
                    </Label>
                    <Input
                      value={phaseForm.prefix}
                      onChange={(e) => setPhaseForm((prev) => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
                      placeholder="e.g., C"
                      maxLength={3}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/30 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false);
                resetActivityForm();
                setPhaseForm({ code: '', label: '', prefix: '' });
              }}
            >
              Cancel
            </Button>
            {addType === 'activity' || editingActivity ? (
              <Button
                onClick={handleSaveActivity}
                disabled={!activityForm.activity || !activityForm.phase_id || isCreating || isUpdating}
              >
                {isCreating || isUpdating ? 'Saving...' : editingActivity ? 'Update Activity' : 'Add Activity'}
              </Button>
            ) : (
              <Button
                onClick={handleSavePhase}
                disabled={!phaseForm.code || !phaseForm.label || !phaseForm.prefix || isCreatingPhase}
              >
                {isCreatingPhase ? 'Saving...' : 'Add Phase'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Activity Dialog */}
      <Dialog open={!!viewingActivity} onOpenChange={() => setViewingActivity(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 space-y-1 flex-shrink-0">
            <DialogTitle className="text-xl font-semibold">View Activity</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Activity details for {viewingActivity?.activity}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-5 border-t border-border/60 pt-5 flex-1 overflow-y-auto min-h-0">
            {viewingActivity && (
              <>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    Activity ID
                  </Label>
                  <Input value={formatActivityCode(viewingActivity.activity_code)} disabled className="bg-muted font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    Phase
                  </Label>
                  <Input
                    value={visiblePhases.find((p) => p.id === viewingActivity.phase_id)?.label || '-'}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    Activity
                  </Label>
                  <Input value={viewingActivity.activity} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    Description
                  </Label>
                  <Textarea value={viewingActivity.description || ''} disabled className="bg-muted resize-none h-auto" rows={Math.max(3, (viewingActivity.description || '').split('\n').length + Math.ceil((viewingActivity.description || '').length / 60))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                      High (days)
                    </Label>
                    <Input value={viewingActivity.duration_high ?? ''} disabled className="bg-muted text-center" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                      Med (days)
                    </Label>
                    <Input value={viewingActivity.duration_med ?? ''} disabled className="bg-muted text-center" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                      Low (days)
                    </Label>
                    <Input value={viewingActivity.duration_low ?? ''} disabled className="bg-muted text-center" />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/30 flex-shrink-0">
            <Button variant="outline" onClick={() => setViewingActivity(null)}>
              Close
            </Button>
            {viewingActivity && (
              <Button
                onClick={() => {
                  setViewingActivity(null);
                  openEditActivity(viewingActivity);
                }}
              >
                Edit Activity
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
