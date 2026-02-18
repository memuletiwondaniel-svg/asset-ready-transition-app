import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, BookOpen, Trash2, User, Rocket, Settings, X, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProceduresStepProps {
  vcrId: string;
}

const PROCEDURE_TYPES = [
  { value: 'startup', label: 'Initial Start-Up', icon: Rocket, color: 'text-orange-500', activeBg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600' },
  { value: 'operating', label: 'Normal Operating', icon: Settings, color: 'text-blue-500', activeBg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600' },
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
        {items.length > 0 && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Procedure
          </Button>
        )}
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
        <SheetContent className="w-[480px] sm:max-w-[480px] flex flex-col gap-0 p-0">
      <AddProcedureForm
            vcrId={vcrId}
            onSubmit={(item) => addItem.mutate(item)}
            isSaving={addItem.isPending}
            onCancel={() => setAddOpen(false)}
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
  vcrId: string;
  onSubmit: (item: any) => void;
  isSaving: boolean;
  onCancel: () => void;
}> = ({ vcrId, onSubmit, isSaving, onCancel }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'startup' | 'operating'>('startup');
  const [reason, setReason] = useState('');
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);

  const { data: mappedSystems = [] } = useQuery({
    queryKey: ['vcr-mapped-systems', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .select('system_id, p2a_systems(id, tag, name)')
        .eq('handover_point_id', vcrId);
      if (error) throw error;
      // deduplicate by system_id
      const seen = new Set<string>();
      return (data || []).filter((r: any) => {
        if (!r.p2a_systems || seen.has(r.system_id)) return false;
        seen.add(r.system_id);
        return true;
      }).map((r: any) => ({
        id: r.system_id,
        label: r.p2a_systems.tag
          ? `${r.p2a_systems.tag} – ${r.p2a_systems.name}`
          : r.p2a_systems.name,
      }));
    },
  });

  const toggleSystem = (id: string) => {
    setSelectedSystems(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const removeSystem = (id: string) => setSelectedSystems(prev => prev.filter(s => s !== id));

  const handleSubmit = () => {
    if (!title.trim()) return;
    const selectedLabels = mappedSystems
      .filter((s: any) => selectedSystems.includes(s.id))
      .map((s: any) => s.label);
    onSubmit({
      title: title.trim(),
      procedure_type: type,
      description: reason.trim() || null,
      responsible_person: selectedLabels.length > 0 ? selectedLabels.join(', ') : null,
    });
  };

  return (
    <>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <SheetTitle className="text-lg font-semibold">New Procedure</SheetTitle>
        </div>
        <p className="text-sm text-muted-foreground ml-11">
          Add a procedure to the plan. Document numbering and approval workflow will be activated once the plan is approved.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Procedure Type */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Procedure Type <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {PROCEDURE_TYPES.map(({ value, label, icon: Icon, color, activeBg }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value as 'startup' | 'operating')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center
                  ${type === value
                    ? `${activeBg} shadow-sm`
                    : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50'
                  }`}
              >
                <div className={`p-2 rounded-lg ${type === value ? 'bg-white/60 dark:bg-black/20' : 'bg-muted'}`}>
                  <Icon className={`w-5 h-5 ${type === value ? color : 'text-muted-foreground'}`} />
                </div>
                <span className={`text-sm font-medium leading-tight ${type === value ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Procedure Title <span className="text-destructive">*</span>
          </Label>
          <input
            placeholder="e.g. Gas Turbine Initial Start-up Procedure"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reason for Procedure
            <span className="ml-1.5 normal-case font-normal text-muted-foreground/70">(optional)</span>
          </Label>
          <Textarea
            placeholder="Describe why this procedure is needed..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Applicable Systems */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Applicable Systems
            <span className="ml-1.5 normal-case font-normal text-muted-foreground/70">(optional)</span>
          </Label>

          {mappedSystems.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No systems mapped to this VCR.</p>
          ) : (
            <div className="border rounded-lg divide-y">
              {mappedSystems.map((sys: any) => (
                <label
                  key={sys.id}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <Checkbox
                    checked={selectedSystems.includes(sys.id)}
                    onCheckedChange={() => toggleSystem(sys.id)}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{sys.label}</span>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Selected tags */}
          {selectedSystems.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {mappedSystems
                .filter((s: any) => selectedSystems.includes(s.id))
                .map((s: any) => (
                  <Badge key={s.id} variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1 text-xs">
                    {s.label}
                    <button
                      type="button"
                      onClick={() => removeSystem(s.id)}
                      className="ml-0.5 rounded-full hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-muted/20 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={!title.trim() || isSaving}
        >
          <Plus className="w-4 h-4 mr-2" />
          {isSaving ? 'Adding...' : 'Add Procedure'}
        </Button>
      </div>
    </>
  );
};
