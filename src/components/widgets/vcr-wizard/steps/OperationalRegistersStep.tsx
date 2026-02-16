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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, FileText, Trash2, User, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OperationalRegistersStepProps {
  vcrId: string;
}

const REGISTER_TYPES = [
  { value: 'logsheet', label: 'Log Sheet' },
  { value: 'register', label: 'Register' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'form', label: 'Form' },
];

export const OperationalRegistersStep: React.FC<OperationalRegistersStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: items = [] } = useQuery({
    queryKey: ['vcr-exec-registers', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_operational_registers')
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
        .from('p2a_vcr_operational_registers')
        .insert({ ...item, handover_point_id: vcrId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-registers'] });
      toast.success('Register added');
      setAddOpen(false);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('p2a_vcr_operational_registers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-registers'] });
      toast.success('Register removed');
    },
  });

  const filtered = items.filter((i: any) => typeFilter === 'all' || i.register_type === typeFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline">{items.length} registers</Badge>
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
              {REGISTER_TYPES.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="text-xs px-3 h-7">
                  {t.label}s
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3">
              <ClipboardList className="w-7 h-7 text-cyan-500" />
            </div>
            <h3 className="font-medium">No Log Sheets or Registers</h3>
            <p className="text-xs text-muted-foreground mt-1">Define operational log sheets and registers to develop.</p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mt-3 gap-1.5">
              <Plus className="w-4 h-4" /> Add First
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(min(90vh,780px)-280px)]">
          <div className="space-y-2 pr-4">
            {filtered.map((item: any) => (
              <Card key={item.id} className="group hover:border-cyan-500/40 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-500 shrink-0" />
                        <h4 className="font-medium text-sm truncate">{item.title}</h4>
                        <Badge variant="outline" className="text-[10px]">
                          {REGISTER_TYPES.find(t => t.value === item.register_type)?.label || item.register_type}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
                      )}
                      <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                        {item.responsible_person && (
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.responsible_person}</span>
                        )}
                        <Badge variant="secondary" className="text-[9px]">{item.status}</Badge>
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
            ))}
          </div>
        </ScrollArea>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px]">
          <SheetHeader><SheetTitle>Add Log Sheet / Register</SheetTitle></SheetHeader>
          <AddRegisterForm onSubmit={(item) => addItem.mutate(item)} isSaving={addItem.isPending} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Register</AlertDialogTitle>
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

const AddRegisterForm: React.FC<{
  onSubmit: (item: any) => void;
  isSaving: boolean;
}> = ({ onSubmit, isSaving }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('logsheet');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');
  const [targetDate, setTargetDate] = useState('');

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {REGISTER_TYPES.map(t => (
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
          title, register_type: type, description: description || null,
          responsible_person: responsible || null, target_date: targetDate || null,
        })}
        disabled={!title || isSaving}
        className="w-full"
      >
        {isSaving ? 'Adding...' : 'Add Register'}
      </Button>
    </div>
  );
};
