import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
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

const DmsSitesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SiteRow | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formSiteName, setFormSiteName] = useState('');
  const [formComment, setFormComment] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-sites'] }); toast.success('Site created'); setDialogOpen(false); },
    onError: (err: any) => toast.error(err.message || 'Failed to create site'),
  });

  const updateSite = useMutation({
    mutationFn: async (item: { id: string; code: string; site_name: string; comment: string; is_active: boolean }) => {
      const { id, ...rest } = item;
      const { error } = await supabase.from('dms_sites').update({ code: rest.code, site_name: rest.site_name, comment: rest.comment || null, is_active: rest.is_active, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-sites'] }); toast.success('Site updated'); setDialogOpen(false); },
    onError: (err: any) => toast.error(err.message || 'Failed to update site'),
  });

  const deleteSite = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('dms_sites').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-sites'] }); toast.success('Site deleted'); },
    onError: (err: any) => toast.error(err.message || 'Failed to delete site'),
  });

  const filtered = sites.filter(s =>
    s.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.comment || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddDialog = () => { setEditingItem(null); setFormCode(''); setFormSiteName(''); setFormComment(''); setFormIsActive(true); setDialogOpen(true); };
  const openEditDialog = (item: SiteRow) => { setEditingItem(item); setFormCode(item.code); setFormSiteName(item.site_name); setFormComment(item.comment || ''); setFormIsActive(item.is_active); setDialogOpen(true); };

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
            <Button size="sm" className="gap-1.5" onClick={openAddDialog}><Plus className="h-4 w-4" /> Add Site</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-xs font-medium uppercase tracking-wider text-muted-foreground">#</TableHead>
                  <TableHead className="w-24 text-xs font-medium uppercase tracking-wider text-muted-foreground">Code</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Site</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Comment</TableHead>
                  <TableHead className="w-20 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="w-24 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item, idx) => (
                  <TableRow key={item.id} className="group border-border/40 hover:bg-muted/30 transition-colors">
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
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteSite.mutate(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !isLoading && (<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No sites found</TableCell></TableRow>)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-lg font-semibold">{editingItem ? 'Edit Site' : 'Add Site'}</DialogTitle>
            <DialogDescription>{editingItem ? 'Modify the site details below.' : 'Fill in the details to create a new site.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          <DialogFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Create Site'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DmsSitesTab;
