import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OriginatorRow {
  id: string;
  code: string;
  description: string;
  is_active: boolean;
  display_order: number;
}

type SortCol = 'code' | 'description' | 'is_active' | null;

const DmsOriginatorsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OriginatorRow | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) { if (sortDir === 'asc') setSortDir('desc'); else { setSortCol(null); setSortDir('asc'); } }
    else { setSortCol(col); setSortDir('asc'); }
  };
  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };

  const { data: originators = [], isLoading } = useQuery({
    queryKey: ['dms-originators'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dms_originators').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      return data as OriginatorRow[];
    },
  });

  const createOriginator = useMutation({
    mutationFn: async (item: { code: string; description: string; is_active: boolean }) => {
      const maxOrder = originators.length > 0 ? Math.max(...originators.map(o => o.display_order)) : 0;
      const { error } = await supabase.from('dms_originators').insert({ code: item.code, description: item.description, is_active: item.is_active, display_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-originators'] }); toast.success('Originator created'); setSheetOpen(false); },
    onError: (err: any) => toast.error(err.message || 'Failed to create originator'),
  });

  const updateOriginator = useMutation({
    mutationFn: async (item: { id: string; code: string; description: string; is_active: boolean }) => {
      const { error } = await supabase.from('dms_originators').update({ code: item.code, description: item.description, is_active: item.is_active, updated_at: new Date().toISOString() }).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-originators'] }); toast.success('Originator updated'); setSheetOpen(false); },
    onError: (err: any) => toast.error(err.message || 'Failed to update originator'),
  });

  const deleteOriginator = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('dms_originators').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-originators'] }); toast.success('Originator deleted'); },
    onError: (err: any) => toast.error(err.message || 'Failed to delete originator'),
  });

  const sorted = useMemo(() => {
    const filtered = originators.filter(o =>
      o.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'is_active') cmp = (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1);
      else cmp = (a[sortCol] || '').localeCompare(b[sortCol] || '');
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [originators, searchQuery, sortCol, sortDir]);

  const openAddSheet = () => { setEditingItem(null); setFormCode(''); setFormDescription(''); setFormIsActive(true); setSheetOpen(true); };
  const openEditSheet = (item: OriginatorRow) => { setEditingItem(item); setFormCode(item.code); setFormDescription(item.description); setFormIsActive(item.is_active); setSheetOpen(true); };

  const handleSave = () => {
    if (!formCode.trim() || !formDescription.trim()) { toast.error('Code and Description are required'); return; }
    const payload = { code: formCode.trim(), description: formDescription.trim(), is_active: formIsActive };
    if (editingItem) { updateOriginator.mutate({ id: editingItem.id, ...payload }); }
    else { createOriginator.mutate(payload); }
  };

  const isSaving = createOriginator.isPending || updateOriginator.isPending;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-lg">Originator</CardTitle>
            <CardDescription>Manage originator codes used in document numbering</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
            <Button size="sm" className="gap-1.5" onClick={openAddSheet}><Plus className="h-4 w-4" /> Add Originator</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 max-h-[calc(100vh-280px)] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-xs font-medium uppercase tracking-wider text-muted-foreground">#</TableHead>
                  <TableHead className="w-24 text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('code')}>Code<SortIcon col="code" /></TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('description')}>Description<SortIcon col="description" /></TableHead>
                  <TableHead className="w-20 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('is_active')}>Status<SortIcon col="is_active" /></TableHead>
                  <TableHead className="w-16 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item, idx) => (
                  <TableRow key={item.id} className="group border-border/40 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openEditSheet(item)}>
                    <TableCell className="text-muted-foreground text-xs tabular-nums">{idx + 1}</TableCell>
                    <TableCell><span className="inline-flex items-center justify-center h-6 min-w-[2.5rem] px-1.5 rounded bg-muted text-xs font-mono font-medium text-foreground">{item.code}</span></TableCell>
                    <TableCell className="text-sm text-foreground">{item.description}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`h-1.5 w-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); deleteOriginator.mutate(item.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && !isLoading && (<TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No originators found</TableCell></TableRow>)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md z-[150] flex flex-col">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg font-semibold">{editingItem ? 'Edit Originator' : 'Add Originator'}</SheetTitle>
            <SheetDescription>{editingItem ? 'Modify the originator details below.' : 'Fill in the details to create a new originator.'}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Code <span className="text-destructive">*</span></Label>
              <Input value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())} placeholder="e.g. ABB" maxLength={10} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description <span className="text-destructive">*</span></Label>
              <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="e.g. ABB SpA" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><Label className="text-sm font-medium">Active Status</Label><p className="text-xs text-muted-foreground mt-0.5">Enable or disable this originator</p></div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <SheetFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Create Originator'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DmsOriginatorsTab;
