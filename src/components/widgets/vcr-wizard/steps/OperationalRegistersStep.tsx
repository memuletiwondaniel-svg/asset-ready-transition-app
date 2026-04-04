import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Plus, Trash2, User, Calendar, Search, X, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RlmuStatusBadge, DmsStatusBadge, DocumentNumberChip, RlmuUploadButton } from './shared/DmsStatusBadges';

interface OperationalRegistersStepProps {
  vcrId: string;
}

export const OperationalRegistersStep: React.FC<OperationalRegistersStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: items = [] } = useQuery({
    queryKey: ['vcr-register-selections', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_register_selections')
        .select('*, catalog:p2a_vcr_register_catalog(*)')
        .eq('handover_point_id', vcrId)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['vcr-register-catalog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_register_catalog')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('p2a_vcr_register_selections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-register-selections', vcrId] });
      setDeleteTarget(null);
      toast.success('Register removed');
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await (supabase as any).from('p2a_vcr_register_selections').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-register-selections', vcrId] });
    },
  });

  const showSearch = items.length > 5;
  const filtered = showSearch && search.trim()
    ? items.filter((i: any) => {
        const q = search.toLowerCase();
        const name = (i.catalog?.name || i.name || '').toLowerCase();
        const desc = (i.catalog?.description || i.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      })
    : items;

  const newCount = items.filter((i: any) => i.action_type === 'new').length;
  const updateCount = items.filter((i: any) => i.action_type === 'update').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="outline">{items.length} registers</Badge>
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
          <Plus className="w-4 h-4" /> Add Register
        </Button>
      </div>

      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search registers…"
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
            <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3">
              <ClipboardList className="w-7 h-7 text-cyan-500" />
            </div>
            <h3 className="font-medium">No Operational Registers</h3>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
              Select registers from the standard list. Indicate if each is a new development or an update to an existing register.
            </p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mt-3 gap-1.5">
              <Plus className="w-4 h-4" /> Add Register
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No registers match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item: any) => {
            const name = item.catalog?.name || item.name;
            const desc = item.catalog?.description || item.description;
            const code = item.catalog?.register_code;
            const isNew = item.action_type === 'new';

            return (
              <Card key={item.id} className="group hover:border-cyan-500/40 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {code && (
                          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                            {code}
                          </span>
                        )}
                        <ClipboardList className="w-4 h-4 text-cyan-500 shrink-0" />
                        <h4 className="font-medium text-sm truncate">{name}</h4>
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

                      {desc && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{desc}</p>
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
        <SheetContent className="w-[520px] sm:max-w-[520px] z-[150]" overlayClassName="z-[150]">
          <SheetHeader><SheetTitle>Add Operational Register</SheetTitle></SheetHeader>
          <AddRegisterForm
            vcrId={vcrId}
            catalog={catalog}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['vcr-register-selections', vcrId] });
              setAddOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="z-[150]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Register</AlertDialogTitle>
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

// ─── Add Register Form ───────────────────────────────────────────────────────

const AddRegisterForm: React.FC<{
  vcrId: string;
  catalog: any[];
  onSuccess: () => void;
}> = ({ vcrId, catalog, onSuccess }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState<'new' | 'update'>('new');
  const [responsible, setResponsible] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredCatalog = catalog.filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.register_code?.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async () => {
    if (!selectedId) return;
    const catalogItem = catalog.find((c: any) => c.id === selectedId);
    if (!catalogItem) return;
    setIsSaving(true);
    try {
      const { error } = await (supabase as any).from('p2a_vcr_register_selections').insert({
        handover_point_id: vcrId,
        catalog_id: selectedId,
        action_type: actionType,
        responsible_person: responsible || null,
        target_date: targetDate || null,
      });
      if (error) throw error;
      toast.success('Register added');
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add register');
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

      {/* Search */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Select from Standard List</Label>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search registers…" className="pl-7 h-8 text-xs" />
        </div>
      </div>

      {/* Catalog list */}
      {catalog.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No standard registers in the catalog yet.</p>
          <p className="text-xs mt-1">Upload the standard list to populate this catalog.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {filteredCatalog.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-4">No registers match your search.</p>
          ) : (
            filteredCatalog.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  'w-full text-left p-2.5 rounded-lg border text-sm transition-all',
                  selectedId === c.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-center gap-2">
                  {c.register_code && (
                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">{c.register_code}</span>
                  )}
                  <span className="font-medium text-xs flex-1 truncate">{c.name}</span>
                </div>
                {c.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>}
              </button>
            ))
          )}
        </div>
      )}

      {/* Tracking */}
      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div>
          <Label>Responsible Person</Label>
          <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Target Date</Label>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="mt-1" />
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!selectedId || isSaving} className="w-full">
        {isSaving ? 'Adding…' : 'Add to VCR Plan'}
      </Button>
    </div>
  );
};
