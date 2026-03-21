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

interface SiteRow {
  id: string;
  code: string;
  site_name: string;
  comment: string | null;
  is_active: boolean;
  display_order: number;
}

type SortCol = 'code' | 'site_name' | 'comment' | 'is_active' | null;

const DmsSitesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SiteRow | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formSiteName, setFormSiteName] = useState('');
  const [formComment, setFormComment] = useState('');
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

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['dms-sites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dms_sites').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      return data as SiteRow[];
    },
  });

  const createSite = useMutation({
    mutationFn: async (item: { code: string; site_name: string; comment: string; is_active: boolean }) => {
      const maxOrder = sites.length > 0 ? Math.max(...sites.map(s => s.display_order)) : 0;
      const { error } = await supabase.from('dms_sites').insert({ code: item.code, site_name: item.site_name, comment: item.comment || null, is_active: item.is_active, display_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-sites'] }); toast.success('Site created'); setSheetOpen(false); },
    onError: (err: any) => toast.error(err.message || 'Failed to create site'),
  });

  const updateSite = useMutation({
    mutationFn: async (item: { id: string; code: string; site_name: string; comment: string; is_active: boolean }) => {
      const { id, ...rest } = item;
      const { error } = await supabase.from('dms_sites').update({ code: rest.code, site_name: rest.site_name, comment: rest.comment || null, is_active: rest.is_active, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-sites'] }); toast.success('Site updated'); setSheetOpen(false); },
    onError: (err: any) => toast.error(err.message || 'Failed to update site'),
  });

  const deleteSite = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('dms_sites').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-sites'] }); toast.success('Site deleted'); },
    onError: (err: any) => toast.error(err.message || 'Failed to delete site'),
  });

  const sorted = useMemo(() => {
    const filtered = sites.filter(s =>
      s.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.comment || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'is_active') cmp = (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1);
      else cmp = (a[sortCol] || '').localeCompare(b[sortCol] || '');
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [sites, searchQuery, sortCol, sortDir]);

  const openAddSheet = () => { setEditingItem(null); setFormCode(''); setFormSiteName(''); setFormComment(''); setFormIsActive(true); setSheetOpen(true); };
  const openEditSheet = (item: SiteRow) => { setEditingItem(item); setFormCode(item.code); setFormSiteName(item.site_name); setFormComment(item.comment || ''); setFormIsActive(item.is_active); setSheetOpen(true); };

  const handleSave = () => {
    if (!formCode.trim() || !formSiteName.trim()) { toast.error('Code and Site name are required'); return; }
    const payload = { code: formCode.trim(), site_name: formSiteName.trim(), comment: formComment.trim(), is_active: formIsActive };
    if (editingItem) { updateSite.mutate({ id: editingItem.id, ...payload }); }
    else { createSite.mutate(payload); }
  };

  const isSaving = createSite.isPending || updateSite.isPending;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-lg">Site</CardTitle>
            <CardDescription>Manage site codes used in document numbering</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
            <Button size="sm" className="gap-1.5" onClick={openAddSheet}><Plus className="h-4 w-4" /> Add Site</Button>
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
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('site_name')}>Site<SortIcon col="site_name" /></TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('comment')}>Comment<SortIcon col="comment" /></TableHead>
                  <TableHead className="w-20 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('is_active')}>Status<SortIcon col="is_active" /></TableHead>
                  <TableHead className="w-16 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item, idx) => (
                  <TableRow key={item.id} className="group border-border/40 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openEditSheet(item)}>
                    <TableCell className="text-muted-foreground text-xs tabular-nums">{idx + 1}</TableCell>
                    <TableCell><span className="inline-flex items-center justify-center h-6 min-w-[2.5rem] px-1.5 rounded bg-muted text-xs font-mono font-medium text-foreground">{item.code}</span></TableCell>
                    <TableCell className="text-sm text-foreground">{item.site_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{item.comment || '—'}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`h-1.5 w-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); deleteSite.mutate(item.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && !isLoading && (<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No sites found</TableCell></TableRow>)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md z-[150] flex flex-col">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg font-semibold">{editingItem ? 'Edit Site' : 'Add Site'}</SheetTitle>
            <SheetDescription>{editingItem ? 'Modify the site details below.' : 'Fill in the details to create a new site.'}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Code <span className="text-destructive">*</span></Label>
              <Input value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())} placeholder="e.g. BNGL" maxLength={10} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Site Name <span className="text-destructive">*</span></Label>
              <Input value={formSiteName} onChange={e => setFormSiteName(e.target.value)} placeholder="e.g. Basrah NGL" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Comment</Label>
              <Input value={formComment} onChange={e => setFormComment(e.target.value)} placeholder="Optional comment" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><Label className="text-sm font-medium">Active Status</Label><p className="text-xs text-muted-foreground mt-0.5">Enable or disable this site</p></div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <SheetFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Create Site'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DmsSitesTab;
