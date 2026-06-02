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
import { Plus, Package, Trash2, Calendar, User, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface SparesStepProps {
  vcrId: string;
}

const STATUS_OPTIONS = [
  { value: 'to_order', label: 'To Order' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'received', label: 'Received' },
  { value: 'stocked', label: 'Stocked' },
];

interface FormState {
  title: string;
  part_number: string;
  quantity: string;
  description: string;
  responsible_person: string;
  target_date: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  part_number: '',
  quantity: '',
  description: '',
  responsible_person: '',
  target_date: '',
  status: 'to_order',
};

export const SparesStep: React.FC<SparesStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ['vcr-exec-spares', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_spares')
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
      const qty = item.quantity ? parseInt(item.quantity, 10) : null;
      const payload: any = {
        title: item.title.trim(),
        part_number: item.part_number.trim() || null,
        quantity: Number.isFinite(qty as number) ? qty : null,
        description: item.description.trim() || null,
        responsible_person: item.responsible_person.trim() || null,
        target_date: item.target_date || null,
        status: item.status,
        display_order: items.length,
        handover_point_id: vcrId,
        created_by: user?.id || null,
      };
      const { error } = await (supabase as any).from('p2a_vcr_spares').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-spares'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts'] });
      toast.success('Spare part added');
      setAddOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: any) => {
      console.error('Failed to add spare:', err);
      toast.error(err?.message || 'Failed to add spare part');
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('p2a_vcr_spares').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-spares'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts'] });
      toast.success('Spare part removed');
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to remove'),
  });

  const canSubmit = form.title.trim().length > 0 && !addItem.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{items.length} 2Y spares</Badge>
        {items.length > 0 && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add 2Y Spare
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-teal-500/10 flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-teal-500" />
            </div>
            <h3 className="font-medium">No 2Y Spares</h3>
            <p className="text-xs text-muted-foreground mt-1">Add 2-year operating spares required for this VCR.</p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mt-3 gap-1.5">
              <Plus className="w-4 h-4" /> Add First 2Y Spare
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
                      <Package className="w-4 h-4 text-teal-500 shrink-0" />
                      <h4 className="font-medium text-sm truncate">{item.title}</h4>
                      <Badge variant="secondary" className="text-[9px]">
                        {STATUS_OPTIONS.find(s => s.value === item.status)?.label || item.status}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                      {item.part_number && (
                        <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{item.part_number}</span>
                      )}
                      {item.quantity != null && (
                        <span className="flex items-center gap-1">Qty: {item.quantity}</span>
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
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Spare Part</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Pump seal kit" />
            </div>
            <div>
              <Label>Part Number</Label>
              <Input value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value })} />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min={0} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
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
            <AlertDialogTitle>Delete Spare Part</AlertDialogTitle>
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
