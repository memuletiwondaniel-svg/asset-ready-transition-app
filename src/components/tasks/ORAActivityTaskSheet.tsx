import React, { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarCheck, Clock, CheckCircle2, Play, Upload, MessageSquare, 
  Calendar, Paperclip, X, Loader2, AlertTriangle 
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

export const ORAActivityTaskSheet: React.FC<ORAActivityTaskSheetProps> = ({
  task,
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ActivityStatus>('NOT_STARTED');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<{ text: string; date: string }[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const metadata = task?.metadata as Record<string, any> | undefined;
  const activityName = metadata?.activity_name || task?.title || '';
  const activityCode = metadata?.activity_code || '';
  const phase = metadata?.phase || '';
  const startDate = metadata?.start_date as string | undefined;
  const endDate = metadata?.end_date as string | undefined;
  const planId = metadata?.plan_id as string | undefined;
  const deliverableId = metadata?.deliverable_id as string | undefined;
  const isOverdue = endDate && isPast(parseISO(endDate)) && status !== 'COMPLETED';

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

      // Update deliverable status if we have a deliverable ID
      if (deliverableId) {
        const completionPct = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 50 : 0;
        await supabase
          .from('orp_plan_deliverables')
          .update({ 
            status, 
            completion_percentage: completionPct,
            ...(status === 'COMPLETED' ? { end_date: new Date().toISOString().split('T')[0] } : {}),
          })
          .eq('id', deliverableId);
      }

      // Update task status
      const taskStatus = status === 'COMPLETED' ? 'completed' : status === 'IN_PROGRESS' ? 'in_progress' : 'pending';
      await supabase
        .from('user_tasks')
        .update({ 
          status: taskStatus, 
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
      queryClient.invalidateQueries({ queryKey: ['user-orp-activities'] });

      toast.success(status === 'COMPLETED' ? 'Activity marked as completed' : 'Activity progress saved');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to save activity progress');
    } finally {
      setSaving(false);
    }
  };

  if (!task) return null;

  const currentStep = STATUS_STEPS.findIndex(s => s.value === status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600 gap-1">
              <CalendarCheck className="h-3 w-3" />
              ORA Activity
            </Badge>
            {activityCode && (
              <Badge variant="outline" className="text-[10px] font-mono">{activityCode}</Badge>
            )}
            {isOverdue && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </Badge>
            )}
          </div>
          <SheetTitle className="text-left text-lg leading-snug mt-2">
            {activityName}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
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

          {/* Status Toggle */}
          <div>
            <p className="text-sm font-medium mb-3">Status</p>
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
              {STATUS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = status === step.value;
                return (
                  <button
                    key={step.value}
                    onClick={() => setStatus(step.value)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all",
                      isActive && step.value === 'NOT_STARTED' && "bg-background shadow-sm text-foreground",
                      isActive && step.value === 'IN_PROGRESS' && "bg-blue-500 text-white shadow-sm",
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
          </div>

          <Separator />

          {/* Comments */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
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

          <Separator />

          {/* Evidence Upload */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Paperclip className="h-4 w-4" />
              Evidence
            </p>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
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

          <Separator />

          {/* Save / Complete */}
          <div className="flex gap-3 pb-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className={cn(
                "flex-1 gap-2",
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
                  Mark Complete
                </>
              ) : (
                'Save Progress'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
