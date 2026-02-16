import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, BookOpen, Trash2, User, Rocket, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProceduresStepProps {
  vcrId: string;
}

const PROCEDURE_TYPES = [
  { value: 'startup', label: 'Initial Start-up', icon: Rocket, color: 'text-orange-500' },
  { value: 'operating', label: 'Normal Operating', icon: Settings, color: 'text-blue-500' },
  { value: 'emergency', label: 'Emergency', icon: BookOpen, color: 'text-red-500' },
  { value: 'maintenance', label: 'Maintenance', icon: Settings, color: 'text-amber-500' },
];

const STATUS_OPTIONS = [
  { value: 'to_develop', label: 'To Develop' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'draft_ready', label: 'Draft Ready' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
];

export const ProceduresStep: React.FC<ProceduresStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ['vcr-exec-procedures', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_procedures')
        .select('*')
        .eq('handover_point_id', vcrId)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const addItem = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await (supabase as any)
        .from('p2a_vcr_procedures')
        .insert({ ...item, handover_point_id: vcrId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-procedures'] });
      toast.success('Procedure added');
      setAddOpen(false);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('p2a_vcr_procedures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-procedures'] });
      toast.success('Procedure removed');
    },
  });

  const getTypeConfig = (type: string) => PROCEDURE_TYPES.find(t => t.value === type) || PROCEDURE_TYPES[1];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{items.length} procedures</Badge>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Procedure
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
              <BookOpen className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="font-medium">No Procedures</h3>
            <p className="text-xs text-muted-foreground mt-1">Define procedures that need to be developed.</p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mt-3 gap-1.5">
              <Plus className="w-4 h-4" /> Add First Procedure
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(min(90vh,780px)-280px)]">
          <div className="space-y-2 pr-4">
            {items.map((item: any) => {
              const typeConfig = getTypeConfig(item.procedure_type);
              const TypeIcon = typeConfig.icon;
              return (
                <Card key={item.id} className="group hover:border-emerald-500/40 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <TypeIcon className={cn('w-4 h-4 shrink-0', typeConfig.color)} />
                          <h4 className="font-medium text-sm truncate">{item.title}</h4>
                          <Badge variant="outline" className="text-[10px]">{typeConfig.label}</Badge>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
                        )}
                        <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                          {item.responsible_person && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.responsible_person}</span>
                          )}
                          <Badge variant="secondary" className="text-[9px]">
                            {STATUS_OPTIONS.find(s => s.value === item.status)?.label || item.status}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteTarget(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px]">
          <SheetHeader><SheetTitle>Add Procedure</SheetTitle></SheetHeader>
          <AddProcedureForm
            onSubmit={(item) => addItem.mutate(item)}
            isSaving={addItem.isPending}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Procedure</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteItem.mutate(deleteTarget)}
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

const AddProcedureForm: React.FC<{
  onSubmit: (item: any) => void;
  isSaving: boolean;
}> = ({ onSubmit, isSaving }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('operating');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');
  const [targetDate, setTargetDate] = useState('');

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Procedure Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label>Procedure Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PROCEDURE_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Responsible Person</Label>
          <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Target Date</Label>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="mt-1" />
        </div>
      </div>
      <Button
        onClick={() => onSubmit({
          title,
          procedure_type: type,
          description: description || null,
          responsible_person: responsible || null,
          target_date: targetDate || null,
        })}
        disabled={!title || isSaving}
        className="w-full"
      >
        {isSaving ? 'Adding...' : 'Add Procedure'}
      </Button>
    </div>
  );
};
