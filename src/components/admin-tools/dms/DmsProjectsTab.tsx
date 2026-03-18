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

interface ProjectRow {
  id: string;
  code: string;
  project_id: string | null;
  project_name: string;
  cabinet: string | null;
  is_active: boolean;
  display_order: number;
}

interface DmsProjectsTabProps {
  searchQuery: string;
}

const DmsProjectsTab: React.FC<DmsProjectsTabProps> = ({ searchQuery }) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectRow | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formProjectName, setFormProjectName] = useState('');
  const [formCabinet, setFormCabinet] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['dms-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_projects')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as ProjectRow[];
    },
  });

  const createProject = useMutation({
    mutationFn: async (item: { code: string; project_id: string; project_name: string; cabinet: string; is_active: boolean }) => {
      const maxOrder = projects.length > 0 ? Math.max(...projects.map(p => p.display_order)) : 0;
      const { error } = await supabase
        .from('dms_projects')
        .insert({ code: item.code, project_id: item.project_id, project_name: item.project_name, cabinet: item.cabinet, is_active: item.is_active, display_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-projects'] }); toast.success('Project created'); },
    onError: (err: any) => toast.error(err.message || 'Failed to create project'),
  });

  const updateProject = useMutation({
    mutationFn: async (item: { id: string; code: string; project_id: string; project_name: string; cabinet: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('dms_projects')
        .update({ code: item.code, project_id: item.project_id, project_name: item.project_name, cabinet: item.cabinet, is_active: item.is_active, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-projects'] }); toast.success('Project updated'); },
    onError: (err: any) => toast.error(err.message || 'Failed to update project'),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dms_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-projects'] }); toast.success('Project deleted'); },
    onError: (err: any) => toast.error(err.message || 'Failed to delete project'),
  });

  const filtered = projects.filter(p =>
    p.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.project_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.cabinet || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddDialog = () => {
    setEditingItem(null);
    setFormCode('');
    setFormProjectId('');
    setFormProjectName('');
    setFormCabinet('');
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (item: ProjectRow) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormProjectId(item.project_id || '');
    setFormProjectName(item.project_name);
    setFormCabinet(item.cabinet || '');
    setFormIsActive(item.is_active);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formCode.trim() || !formProjectName.trim()) {
      toast.error('Code and Project Name are required');
      return;
    }
    const payload = { code: formCode.trim(), project_id: formProjectId.trim(), project_name: formProjectName.trim(), cabinet: formCabinet.trim(), is_active: formIsActive };
    if (editingItem) {
      updateProject.mutate({ id: editingItem.id, ...payload });
    } else {
      createProject.mutate(payload);
    }
    setDialogOpen(false);
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
          <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
            <Plus className="h-4 w-4" /> Add Project
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-xs font-medium uppercase tracking-wider text-muted-foreground">#</TableHead>
                  <TableHead className="w-24 text-xs font-medium uppercase tracking-wider text-muted-foreground">Code</TableHead>
                  <TableHead className="w-28 text-xs font-medium uppercase tracking-wider text-muted-foreground">Project ID</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Project Name</TableHead>
                  <TableHead className="w-28 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cabinet</TableHead>
                  <TableHead className="w-20 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="w-24 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item, idx) => (
                  <TableRow key={item.id} className="group border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="text-muted-foreground text-xs tabular-nums">{idx + 1}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center justify-center h-6 min-w-[2.5rem] px-1.5 rounded bg-muted text-xs font-mono font-medium text-foreground">
                        {item.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.project_id || '—'}</TableCell>
                    <TableCell className="text-sm text-foreground">{item.project_name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center justify-center h-6 min-w-[2.5rem] px-1.5 rounded bg-muted text-xs font-mono font-medium text-muted-foreground">
                        {item.cabinet || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteProject.mutate(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No projects found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Project' : 'Add Project'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the project details' : 'Create a new project entry'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())} placeholder="e.g. 1001" maxLength={10} />
            </div>
            <div className="space-y-2">
              <Label>Project ID</Label>
              <Input value={formProjectId} onChange={e => setFormProjectId(e.target.value)} placeholder="e.g. DP-146" />
            </div>
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input value={formProjectName} onChange={e => setFormProjectName(e.target.value)} placeholder="e.g. ST/DP146 Class 1 Metering" />
            </div>
            <div className="space-y-2">
              <Label>Cabinet</Label>
              <Input value={formCabinet} onChange={e => setFormCabinet(e.target.value)} placeholder="e.g. BGC_PROJ" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
              <Label className="text-sm">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DmsProjectsTab;
