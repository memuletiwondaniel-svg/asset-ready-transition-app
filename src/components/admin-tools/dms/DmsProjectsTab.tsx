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

interface ProjectRow {
  id: string;
  code: string;
  project_id: string | null;
  project_name: string;
  cabinet: string | null;
  is_active: boolean;
  display_order: number;
}

type SortCol = 'code' | 'project_id' | 'project_name' | 'cabinet' | 'is_active' | null;

const DmsProjectsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectRow | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formProjectName, setFormProjectName] = useState('');
  const [formCabinet, setFormCabinet] = useState('');
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

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['dms-projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dms_projects').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      return data as ProjectRow[];
    },
  });

  const createProject = useMutation({
    mutationFn: async (item: { code: string; project_id: string; project_name: string; cabinet: string; is_active: boolean }) => {
      const maxOrder = projects.length > 0 ? Math.max(...projects.map(p => p.display_order)) : 0;
      const { error } = await supabase.from('dms_projects').insert({ ...item, display_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-projects'] }); toast.success('Project created'); setSheetOpen(false); },
    onError: (err: any) => toast.error(err.message || 'Failed to create project'),
  });

  const updateProject = useMutation({
    mutationFn: async (item: { id: string; code: string; project_id: string; project_name: string; cabinet: string; is_active: boolean }) => {
      const { id, ...rest } = item;
      const { error } = await supabase.from('dms_projects').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-projects'] }); toast.success('Project updated'); setSheetOpen(false); },
    onError: (err: any) => toast.error(err.message || 'Failed to update project'),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('dms_projects').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-projects'] }); toast.success('Project deleted'); },
    onError: (err: any) => toast.error(err.message || 'Failed to delete project'),
  });

  const sorted = useMemo(() => {
    const filtered = projects.filter(p =>
      p.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.project_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.cabinet || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'is_active') cmp = (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1);
      else cmp = (a[sortCol] || '').localeCompare(b[sortCol] || '');
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [projects, searchQuery, sortCol, sortDir]);

  const openAddSheet = () => { setEditingItem(null); setFormCode(''); setFormProjectId(''); setFormProjectName(''); setFormCabinet(''); setFormIsActive(true); setSheetOpen(true); };
  const openEditSheet = (item: ProjectRow) => { setEditingItem(item); setFormCode(item.code); setFormProjectId(item.project_id || ''); setFormProjectName(item.project_name); setFormCabinet(item.cabinet || ''); setFormIsActive(item.is_active); setSheetOpen(true); };

  const stripProjectPrefix = (name: string) => name.replace(/^ST\/DP[0-9]+\s*[-–]?\s*/i, '').trim();

  const handleSave = () => {
    if (!formCode.trim() || !formProjectName.trim()) { toast.error('Code and Project Name are required'); return; }
    const cleanedName = stripProjectPrefix(formProjectName.trim());
    const payload = { code: formCode.trim(), project_id: formProjectId.trim(), project_name: cleanedName, cabinet: formCabinet.trim(), is_active: formIsActive };
    if (editingItem) { updateProject.mutate({ id: editingItem.id, ...payload }); }
    else { createProject.mutate(payload); }
  };

  const isSaving = createProject.isPending || updateProject.isPending;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-lg">Project</CardTitle>
            <CardDescription>Manage project codes used in document numbering</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
            <Button size="sm" className="gap-1.5" onClick={openAddSheet}><Plus className="h-4 w-4" /> Add Project</Button>
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
                  <TableHead className="w-28 text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('project_id')}>Project ID<SortIcon col="project_id" /></TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('project_name')}>Project Name<SortIcon col="project_name" /></TableHead>
                  <TableHead className="w-28 text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('cabinet')}>Cabinet<SortIcon col="cabinet" /></TableHead>
                  <TableHead className="w-20 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('is_active')}>Status<SortIcon col="is_active" /></TableHead>
                  <TableHead className="w-16 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item, idx) => (
                  <TableRow key={item.id} className="group border-border/40 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openEditSheet(item)}>
                    <TableCell className="text-muted-foreground text-xs tabular-nums">{idx + 1}</TableCell>
                    <TableCell><span className="inline-flex items-center justify-center h-6 min-w-[2.5rem] px-1.5 rounded bg-muted text-xs font-mono font-medium text-foreground">{item.code}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.project_id || '—'}</TableCell>
                    <TableCell className="text-sm text-foreground">{stripProjectPrefix(item.project_name)}</TableCell>
                    <TableCell><span className="inline-flex items-center justify-center h-6 min-w-[2.5rem] px-1.5 rounded bg-muted text-xs font-mono font-medium text-muted-foreground">{item.cabinet || '—'}</span></TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`h-1.5 w-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); deleteProject.mutate(item.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && !isLoading && (<TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No projects found</TableCell></TableRow>)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-lg z-[150] flex flex-col">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg font-semibold">{editingItem ? 'Edit Project' : 'Add Project'}</SheetTitle>
            <SheetDescription>{editingItem ? 'Modify the project details below.' : 'Fill in the details to create a new project.'}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Code <span className="text-destructive">*</span></Label>
                <Input value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())} placeholder="e.g. 1001" maxLength={10} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Project ID</Label>
                <Input value={formProjectId} onChange={e => setFormProjectId(e.target.value)} placeholder="e.g. DP-146" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Project Name <span className="text-destructive">*</span></Label>
              <Input value={formProjectName} onChange={e => setFormProjectName(e.target.value)} placeholder="e.g. ST/DP146 Class 1 Metering" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Cabinet</Label>
              <Input value={formCabinet} onChange={e => setFormCabinet(e.target.value)} placeholder="e.g. BGC_PROJ" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><Label className="text-sm font-medium">Active Status</Label><p className="text-xs text-muted-foreground mt-0.5">Enable or disable this project</p></div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <SheetFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Create Project'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DmsProjectsTab;
