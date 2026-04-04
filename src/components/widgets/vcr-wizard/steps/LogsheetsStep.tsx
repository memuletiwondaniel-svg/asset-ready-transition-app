import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollText, Plus, Trash2, User, Calendar, Search, X, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RlmuStatusBadge, DmsStatusBadge, DocumentNumberChip, RlmuUploadButton } from './shared/DmsStatusBadges';

interface LogsheetsStepProps {
  vcrId: string;
}

export const LogsheetsStep: React.FC<LogsheetsStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: items = [] } = useQuery({
    queryKey: ['vcr-logsheets', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_logsheets')
        .select('*')
        .eq('handover_point_id', vcrId)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('p2a_vcr_logsheets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-logsheets', vcrId] });
      setDeleteTarget(null);
      toast.success('Logsheet removed');
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await (supabase as any).from('p2a_vcr_logsheets').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-logsheets', vcrId] });
    },
  });

  const showSearch = items.length > 5;
  const filtered = showSearch && search.trim()
    ? items.filter((i: any) => {
        const q = search.toLowerCase();
        return (
          i.title?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
        );
      })
    : items;

  const newCount = items.filter((i: any) => i.action_type === 'new').length;
  const updateCount = items.filter((i: any) => i.action_type === 'update').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="outline">{items.length} logsheets</Badge>
          {newCount > 0 && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">
              <Sparkles className="w-3 h-3 mr-1" />{newCount} New
            </Badge>
          )}
          {updateCount > 0 && (
            <Badge variant="outline" className="text-blue-600 border-blue-300 text-[10px]">
              <RefreshCw className="w-3 h-3 mr-1" />{updateCount} Update
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Logsheet
        </Button>
      </div>

      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logsheets…"
            className="pl-9 pr-8 h-8 text-xs"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mb-3">
              <ScrollText className="w-7 h-7 text-indigo-500" />
            </div>
            <h3 className="font-medium">No Logsheets</h3>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
              Add logsheets that need to be developed or updated for this VCR handover.
            </p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mt-3 gap-1.5">
              <Plus className="w-4 h-4" /> Add Logsheet
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No logsheets match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item: any) => {
            const isNew = item.action_type === 'new';
            return (
              <Card key={item.id} className="group hover:border-indigo-500/40 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ScrollText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <h4 className="font-medium text-sm truncate">{item.title}</h4>
                        {/* Action type toggle */}
                        <button
                          onClick={() => updateItem.mutate({ id: item.id, updates: { action_type: isNew ? 'update' : 'new' } })}
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors shrink-0',
                            isNew
                              ? 'border-emerald-300 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10'
                              : 'border-blue-300 text-blue-600 bg-blue-500/5 hover:bg-blue-500/10'
                          )}
                        >
                          {isNew ? '✦ New' : '↻ Update'}
                        </button>
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                      )}

                      <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
                        {item.responsible_person && (
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.responsible_person}</span>
                        )}
                        {item.target_date && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.target_date}</span>
                        )}
                        <select
                          value={item.status}
                          onChange={(e) => updateItem.mutate({ id: item.id, updates: { status: e.target.value } })}
                          className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 cursor-pointer"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="complete">Complete</option>
                        </select>
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
            );
          })}
        </div>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] z-[150]" overlayClassName="z-[150]">
          <SheetHeader><SheetTitle>Add Logsheet</SheetTitle></SheetHeader>
          <AddLogsheetForm
            vcrId={vcrId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['vcr-logsheets', vcrId] });
              setAddOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="z-[150]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Logsheet</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteItem.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Add Logsheet Form ───────────────────────────────────────────────────────

const AddLogsheetForm: React.FC<{
  vcrId: string;
  onSuccess: () => void;
}> = ({ vcrId, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionType, setActionType] = useState<'new' | 'update'>('new');
  const [responsible, setResponsible] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await (supabase as any).from('p2a_vcr_logsheets').insert({
        handover_point_id: vcrId,
        title: title.trim(),
        description: description || null,
        action_type: actionType,
        responsible_person: responsible || null,
        target_date: targetDate || null,
      });
      if (error) throw error;
      toast.success('Logsheet added');
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add logsheet');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Action type */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Action Type</Label>
        <div className="flex gap-2 mt-2">
          {(['new', 'update'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActionType(t)}
              className={cn(
                'flex-1 py-2 rounded-lg border text-sm font-medium transition-all',
                actionType === t
                  ? t === 'new'
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-700'
                    : 'border-blue-400 bg-blue-500/10 text-blue-700'
                  : 'border-border text-muted-foreground hover:bg-muted/40'
              )}
            >
              {t === 'new' ? '✦ New Development' : '↻ Update Existing'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Logsheet Name *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Daily Production Logsheet" className="mt-1" />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the purpose and content of this logsheet…"
          className="mt-1"
          rows={3}
        />
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

      <Button onClick={handleSubmit} disabled={!title.trim() || isSaving} className="w-full">
        {isSaving ? 'Adding…' : 'Add Logsheet'}
      </Button>
    </div>
  );
};
