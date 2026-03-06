import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Clock, CheckCircle2, Play, Upload, MessageSquare, 
  Calendar, Paperclip, X, Loader2, AlertTriangle, Trash2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import type { UserTask } from '@/hooks/useUserTasks';

interface ORAActivityTaskSheetProps {
  task: UserTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ActivityStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

const STATUS_STEPS: { value: ActivityStatus; label: string; icon: React.ElementType }[] = [
  { value: 'NOT_STARTED', label: 'Not Started', icon: Clock },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: Play },
  { value: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

// Same palette as Gantt chart for consistency
const ID_BADGE_PALETTE = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const ORAActivityTaskSheet: React.FC<ORAActivityTaskSheetProps> = ({
  task,
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ActivityStatus>('NOT_STARTED');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<{ text: string; date: string }[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progressPct, setProgressPct] = useState(50);

  // Original values for dirty tracking
  const [originalStatus, setOriginalStatus] = useState<ActivityStatus>('NOT_STARTED');
  const [originalDescription, setOriginalDescription] = useState('');

  const metadata = task?.metadata as Record<string, any> | undefined;
  const activityName = metadata?.activity_name || task?.title || '';
  const activityCode = metadata?.activity_code || '';
  const startDate = metadata?.start_date as string | undefined;
  const endDate = metadata?.end_date as string | undefined;
  const planId = metadata?.plan_id as string | undefined;
  const deliverableId = metadata?.deliverable_id as string | undefined;
  const oraActivityId = metadata?.ora_plan_activity_id as string | undefined;
  const isOverdue = endDate && isPast(parseISO(endDate)) && status !== 'COMPLETED';

  // Deterministic color from activity code
  const idColors = activityCode
    ? ID_BADGE_PALETTE[hashCode(activityCode) % ID_BADGE_PALETTE.length]
    : ID_BADGE_PALETTE[0];

  // Derive the real DB id (strip "ora-" or "ws-" prefix if present)
  const realOraActivityId = useMemo(() => {
    const raw = oraActivityId || '';
    if (raw.startsWith('ora-')) return raw.slice(4);
    if (raw.startsWith('ws-')) return raw.slice(3);
    return raw;
  }, [oraActivityId]);

  // Initialize values when sheet opens
  useEffect(() => {
    if (open && task) {
      const initDesc = metadata?.description || task?.description || '';
      // Map the task status back to ActivityStatus
      const taskStatus = task?.status;
      const initStatus: ActivityStatus = taskStatus === 'completed' ? 'COMPLETED'
        : taskStatus === 'in_progress' ? 'IN_PROGRESS' : 'NOT_STARTED';
      setDescription(initDesc);
      setOriginalDescription(initDesc);
      setStatus(initStatus);
      setOriginalStatus(initStatus);
      setComments([]);
      setFiles([]);
      setComment('');
      setProgressPct(50);
    }
  }, [open, task?.id]);

  const isDirty = useMemo(() => {
    return status !== originalStatus || 
           description !== originalDescription || 
           files.length > 0 || 
           comments.length > 0;
  }, [status, originalStatus, description, originalDescription, files.length, comments.length]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc', '.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addComment = () => {
    if (!comment.trim()) return;
    setComments(prev => [...prev, { text: comment, date: new Date().toISOString() }]);
    setComment('');
  };

  const handleSave = async () => {
    if (!task || !user) return;
    setSaving(true);

    try {
      // Upload evidence files
      const uploadedPaths: string[] = [];
      for (const file of files) {
        const path = `ora-evidence/${planId}/${deliverableId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('orp-attachments').upload(path, file);
        if (!error) uploadedPaths.push(path);
      }

      // Upsert ora_plan_activities for description, status, and progress
      if (realOraActivityId && planId) {
        const completionPct = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? progressPct : 0;
        const upsertData: Record<string, any> = {
          id: realOraActivityId,
          orp_plan_id: planId,
          activity_code: activityCode || 'UNKNOWN',
          name: task.title || 'Unnamed',
          status,
          completion_percentage: completionPct,
          source_type: 'wizard',
        };
        if (description !== originalDescription) {
          upsertData.description = description;
        }
        if (status === 'COMPLETED') {
          upsertData.end_date = new Date().toISOString().split('T')[0];
        }
        if (startDate) {
          upsertData.start_date = startDate;
        }
        if (endDate) {
          upsertData.end_date = upsertData.end_date || endDate;
        }
        await (supabase as any)
          .from('ora_plan_activities')
          .upsert(upsertData, { onConflict: 'id' });
      }

      // Also update orp_plan_deliverables if it exists (legacy path)
      if (deliverableId && deliverableId !== realOraActivityId) {
        const completionPct = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? progressPct : 0;
        await supabase
          .from('orp_plan_deliverables')
          .update({ 
            status, 
            completion_percentage: completionPct,
          })
          .eq('id', deliverableId);
      }

      // Update task status (only if task.id is a valid UUID, not a prefixed virtual ID)
      const isRealTaskId = task.id && !task.id.startsWith('ws-') && !task.id.startsWith('ora-');
      if (isRealTaskId) {
        const taskStatus = status === 'COMPLETED' ? 'completed' : status === 'IN_PROGRESS' ? 'in_progress' : 'pending';
        await supabase
          .from('user_tasks')
          .update({ 
            status: taskStatus, 
            updated_at: new Date().toISOString(),
          })
          .eq('id', task.id);
      }

      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
      queryClient.invalidateQueries({ queryKey: ['user-orp-activities'] });
      queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });

      toast.success(status === 'COMPLETED' ? 'Activity marked as completed' : 'Activity progress saved');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to save activity progress');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !user) return;
    setDeleting(true);

    try {
      if (realOraActivityId) {
        await (supabase as any).from('ora_plan_activities').delete().eq('id', realOraActivityId);
      }
      await supabase.from('user_tasks').delete().eq('id', task.id);

      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
      queryClient.invalidateQueries({ queryKey: ['user-orp-activities'] });
      queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });

      toast.success('Activity deleted');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to delete activity');
    } finally {
      setDeleting(false);
    }
  };

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg p-0 flex flex-col h-full">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
          {/* Header */}
          <SheetHeader className="pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {activityCode && (
                <Badge className={cn(
                  "text-[11px] font-mono font-semibold border-0 px-2.5 py-0.5",
                  idColors.bg, idColors.text
                )}>
                  {activityCode}
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue
                </Badge>
              )}
            </div>
            <SheetTitle className="text-left text-lg leading-snug mt-1.5">
              {activityName}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 mt-4">
            {/* Description */}
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Description</p>
              <Textarea
                placeholder="Add a description for this activity..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[140px] resize-none text-sm border-primary/20 focus-visible:ring-primary/30"
              />
            </div>

            {/* Date info */}
            <div className="flex items-center gap-4 text-sm">
              {startDate && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Start: {format(parseISO(startDate), 'MMM d, yyyy')}</span>
                </div>
              )}
              {endDate && (
                <div className={cn(
                  "flex items-center gap-1.5",
                  isOverdue ? "text-destructive" : "text-muted-foreground"
                )}>
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Due: {format(parseISO(endDate), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Status Toggle — extra top spacing */}
            <div className="pt-2">
              <p className="text-sm font-medium mb-3 text-muted-foreground">Status</p>
              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                {STATUS_STEPS.map((step) => {
                  const Icon = step.icon;
                  const isActive = status === step.value;
                  return (
                    <button
                      key={step.value}
                      onClick={() => setStatus(step.value)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all",
                        isActive && step.value === 'NOT_STARTED' && "bg-gray-200 text-gray-700 shadow-sm",
                        isActive && step.value === 'IN_PROGRESS' && "bg-amber-500 text-white shadow-sm",
                        isActive && step.value === 'COMPLETED' && "bg-green-500 text-white shadow-sm",
                        !isActive && "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {step.label}
                    </button>
                  );
                })}
              </div>

              {/* In Progress → slider */}
              {status === 'IN_PROGRESS' && (
                <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Progress</p>
                    <span className="text-sm font-semibold text-amber-600">{progressPct}%</span>
                  </div>
                  <Slider
                    value={[progressPct]}
                    onValueChange={(val) => setProgressPct(val[0])}
                    max={100}
                    step={5}
                    className="[&_[role=slider]]:border-amber-500 [&_[role=slider]]:bg-background [&_.bg-primary]:bg-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Completed → Evidence upload */}
            {status === 'COMPLETED' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <Separator className="mb-5" />
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    Supporting Evidence
                  </p>
                  <div
                    {...getRootProps()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                      isDragActive ? "border-green-500 bg-green-500/5" : "border-border hover:border-green-400/60"
                    )}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Drop files or click to upload
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      PDF, images, Word, Excel (max 10MB)
                    </p>
                  </div>
                  {files.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-muted/40 rounded-md text-xs">
                          <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-muted-foreground shrink-0">
                            {(file.size / 1024).toFixed(0)}KB
                          </span>
                          <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Comments — always visible */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                Comments
              </p>
              {comments.length > 0 && (
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {comments.map((c, i) => (
                    <div key={i} className="p-2.5 bg-muted/40 rounded-lg text-sm">
                      <p>{c.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(parseISO(c.date), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                />
                <Button size="sm" variant="secondary" onClick={addComment} disabled={!comment.trim()}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned footer */}
        <div className="border-t bg-background px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove this activity and its associated task. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              {/* Save / Confirm Completed — only when dirty */}
              {isDirty && (
                <Button
                  size="sm"
                  className={cn(
                    "gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200",
                    status === 'COMPLETED'
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : ""
                  )}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {status === 'COMPLETED' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Completed
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
