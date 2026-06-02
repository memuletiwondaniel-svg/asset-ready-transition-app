import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Wrench, Trash2, Calendar, User, Tag, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProjectCMMSLead } from '@/hooks/useProjectCMMSLead';

interface CMMSStepProps {
  vcrId: string;
}

const STATUS_OPTIONS = [
  { value: 'to_create', label: 'To Create' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'created', label: 'Created' },
  { value: 'verified', label: 'Verified' },
];

interface FormState {
  title: string;
  asset_tag: string;
  description: string;
  target_date: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  asset_tag: '',
  description: '',
  target_date: '',
  status: 'to_create',
};

export const CMMSStep: React.FC<CMMSStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { data: cmmsLead, isLoading: leadLoading } = useProjectCMMSLead(vcrId);

  const { data: items = [] } = useQuery({
    queryKey: ['vcr-exec-cmms', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_cmms')
        .select('*')
        .eq('handover_point_id', vcrId)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const addItem = useMutation({
    mutationFn: async (item: FormState) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        title: item.title.trim(),
        asset_tag: item.asset_tag.trim() || null,
        description: item.description.trim() || null,
        responsible_person: cmmsLead?.full_name ?? null,
        target_date: item.target_date || null,
        status: item.status,
        display_order: items.length,
        handover_point_id: vcrId,
        created_by: user?.id || null,
      };
      const { error } = await (supabase as any).from('p2a_vcr_cmms').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-cmms'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts'] });
      toast.success('CMMS item added');
      setAddOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: any) => {
      console.error('Failed to add CMMS item:', err);
      toast.error(err?.message || 'Failed to add CMMS item');
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('p2a_vcr_cmms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-cmms'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts'] });
      toast.success('CMMS item removed');
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to remove'),
  });

  const canSubmit = form.title.trim().length > 0 && !addItem.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{items.length} CMMS items</Badge>
        {items.length > 0 && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add CMMS Item
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
              <Wrench className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="font-medium">No CMMS Items</h3>
            <p className="text-xs text-muted-foreground mt-1">Add CMMS asset records required for this VCR.</p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mt-3 gap-1.5">
              <Plus className="w-4 h-4" /> Add First CMMS Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-w-[95%]">
          {items.map((item: any) => (
            <Card key={item.id} className="group hover:shadow-md transition-all">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
                      <h4 className="font-medium text-sm truncate">{item.title}</h4>
                      <Badge variant="secondary" className="text-[9px]">
                        {STATUS_OPTIONS.find(s => s.value === item.status)?.label || item.status}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                      {item.asset_tag && (
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{item.asset_tag}</span>
                      )}
                      {item.responsible_person && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.responsible_person}</span>
                      )}
                      {item.target_date && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.target_date}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(item.id)}
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setForm(EMPTY_FORM); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto z-[150]" overlayClassName="z-[150]">
          <SheetHeader>
            <SheetTitle>Add CMMS Item</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Equipment master record" />
            </div>
            <div>
              <Label>Asset Tag</Label>
              <Input value={form.asset_tag} onChange={e => setForm({ ...form, asset_tag: e.target.value })} placeholder="e.g. P-101A" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Responsible Person</Label>
              <Input value={form.responsible_person} onChange={e => setForm({ ...form, responsible_person: e.target.value })} />
            </div>
            <div>
              <Label>Target Date</Label>
              <Input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={!canSubmit} onClick={() => addItem.mutate(form)}>
              {addItem.isPending ? 'Saving...' : 'Add'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="z-[150]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CMMS Item</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteItem.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
