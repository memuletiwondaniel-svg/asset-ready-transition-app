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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import {
  Plus,
  GraduationCap,
  Trash2,
  Clock,
  DollarSign,
  Calendar,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TrainingStepProps {
  vcrId: string;
}

const TARGET_AUDIENCES = [
  'Operations', 'Maintenance - Electrical', 'Maintenance - Mechanical',
  'Maintenance - Instrumentation', 'HSE Team', 'Process Engineering',
  'Control Room Operators', 'Supervisors', 'Management',
];

export const TrainingStep: React.FC<TrainingStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['vcr-exec-training', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_training')
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
        .from('p2a_vcr_training')
        .insert({ ...item, handover_point_id: vcrId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-training'] });
      toast.success('Training item added');
      setAddOpen(false);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('p2a_vcr_training')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-training'] });
      toast.success('Training item removed');
    },
  });

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{items.length} training items</Badge>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Training
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
              <GraduationCap className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="font-medium">No Training Items</h3>
            <p className="text-xs text-muted-foreground mt-1">Add training requirements for this VCR.</p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mt-3 gap-1.5">
              <Plus className="w-4 h-4" />
              Add First Training
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(min(90vh,780px)-280px)]">
          <div className="space-y-2 pr-4">
            {items.map((item: any) => (
              <Card key={item.id} className="group hover:border-blue-500/40 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-blue-500 shrink-0" />
                        <h4 className="font-medium text-sm truncate">{item.title}</h4>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                        {item.training_provider && (
                          <span className="flex items-center gap-1"><Building className="w-3 h-3" />{item.training_provider}</span>
                        )}
                        {item.duration_hours && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.duration_hours}h</span>
                        )}
                        {item.estimated_cost > 0 && (
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${Number(item.estimated_cost).toLocaleString()}</span>
                        )}
                        {item.tentative_date && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.tentative_date}</span>
                        )}
                      </div>
                      {item.target_audience?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.target_audience.map((a: string) => (
                            <Badge key={a} variant="secondary" className="text-[9px]">{a}</Badge>
                          ))}
                        </div>
                      )}
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

      {/* Add Training Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Add Training Item</SheetTitle>
          </SheetHeader>
          <AddTrainingForm
            audiences={TARGET_AUDIENCES}
            onSubmit={(item) => addItem.mutate(item)}
            isSaving={addItem.isPending}
          />
        </SheetContent>
      </Sheet>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Item</AlertDialogTitle>
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

const AddTrainingForm: React.FC<{
  audiences: string[];
  onSubmit: (item: any) => void;
  isSaving: boolean;
}> = ({ audiences, onSubmit, isSaving }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('');
  const [duration, setDuration] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState('');
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);

  const toggleAudience = (a: string) => {
    setSelectedAudiences(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g., DCS Operations Training" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Provider</Label>
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} className="mt-1" placeholder="e.g., Siemens" />
        </div>
        <div>
          <Label>Duration (hours)</Label>
          <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Estimated Cost (USD)</Label>
          <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Tentative Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
      </div>
      <div>
        <Label>Target Audience</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {audiences.map(a => (
            <Badge
              key={a}
              variant={selectedAudiences.includes(a) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => toggleAudience(a)}
            >
              {a}
            </Badge>
          ))}
        </div>
      </div>
      <Button
        onClick={() => onSubmit({
          title,
          description: description || null,
          training_provider: provider || null,
          duration_hours: duration ? parseFloat(duration) : null,
          estimated_cost: cost ? parseFloat(cost) : null,
          tentative_date: date || null,
          target_audience: selectedAudiences,
        })}
        disabled={!title || isSaving}
        className="w-full"
      >
        {isSaving ? 'Adding...' : 'Add Training Item'}
      </Button>
    </div>
  );
};
