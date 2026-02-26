import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit3, Trash2, Search } from 'lucide-react';
import { useORAActivityCatalog, useORPPhases, ORAActivity, ORAActivityInput } from '@/hooks/useORAActivityCatalog';

export const ORAActivityCatalog = () => {
  const [filters, setFilters] = useState({ phase_id: '', search: '' });
  const { activities, isLoading, createActivity, updateActivity, deleteActivity, isCreating, isUpdating } = useORAActivityCatalog({
    phase_id: filters.phase_id || undefined,
    search: filters.search || undefined
  });
  const { phases } = useORPPhases();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ORAActivity | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<ORAActivityInput>({
    activity: '',
    description: '',
    phase_id: '',
    parent_activity_id: null,
    duration_high: undefined,
    duration_med: undefined,
    duration_low: undefined,
  });

  const handleOpenForm = (activity?: ORAActivity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        activity: activity.activity,
        description: activity.description || '',
        phase_id: activity.phase_id || '',
        parent_activity_id: activity.parent_activity_id || null,
        duration_high: activity.duration_high || undefined,
        duration_med: activity.duration_med || undefined,
        duration_low: activity.duration_low || undefined,
      });
    } else {
      setEditingActivity(null);
      setFormData({ activity: '', description: '', phase_id: '', parent_activity_id: null, duration_high: undefined, duration_med: undefined, duration_low: undefined });
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData };
      if (!payload.phase_id) delete payload.phase_id;
      if (!payload.parent_activity_id) payload.parent_activity_id = null;

      if (editingActivity) {
        await updateActivity({ id: editingActivity.id, ...payload });
      } else {
        await createActivity(payload);
      }
      setIsFormOpen(false);
      setEditingActivity(null);
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteActivity(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const getPhaseLabel = (phaseId: string | null) => {
    if (!phaseId) return '-';
    return phases.find(p => p.id === phaseId)?.label || '-';
  };

  const getActivityName = (id: string | null) => {
    if (!id) return '-';
    return activities.find(a => a.id === id)?.activity || '-';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading activity catalog...</div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 bg-card p-3 rounded-lg border">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search activities..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="pl-8 h-9" />
        </div>
        <Select value={filters.phase_id || 'all'} onValueChange={v => setFilters(f => ({ ...f, phase_id: v === 'all' ? '' : v }))}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="All Phases" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={() => handleOpenForm()} size="sm" className="h-9"><Plus className="h-4 w-4 mr-1" />Add Activity</Button>
      </div>

      {/* Table or empty state */}
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4"><Search className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-semibold mb-1">No activities yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">Click "Add Activity" to start building your ORA activity catalog.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Code</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="text-center">High</TableHead>
                <TableHead className="text-center">Med</TableHead>
                <TableHead className="text-center">Low</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map(a => (
                <TableRow key={a.id}>
                  <TableCell><Badge variant="outline" className="font-mono text-xs">{a.activity_code}</Badge></TableCell>
                  <TableCell className="font-medium">{a.activity}</TableCell>
                  <TableCell>{getPhaseLabel(a.phase_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getActivityName(a.parent_activity_id)}</TableCell>
                  <TableCell className="text-center">{a.duration_high ?? '-'}</TableCell>
                  <TableCell className="text-center">{a.duration_med ?? '-'}</TableCell>
                  <TableCell className="text-center">{a.duration_low ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenForm(a)}><Edit3 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirmId(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{editingActivity ? 'Edit Activity' : 'Add New Activity'}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {editingActivity && (
                <div className="space-y-2">
                  <Label>Activity Code</Label>
                  <Input value={editingActivity.activity_code} disabled className="bg-muted" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Activity *</Label>
                <Input value={formData.activity} onChange={e => setFormData(f => ({ ...f, activity: e.target.value }))} placeholder="Enter activity name" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Enter description" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phase</Label>
                  <Select value={formData.phase_id || ''} onValueChange={v => setFormData(f => ({ ...f, phase_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger>
                    <SelectContent>
                      {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Parent Activity</Label>
                  <Select value={formData.parent_activity_id || 'none'} onValueChange={v => setFormData(f => ({ ...f, parent_activity_id: v === 'none' ? null : v }))}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {activities.filter(a => a.id !== editingActivity?.id).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.activity_code} - {a.activity}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Duration High (Days)</Label>
                  <Input type="number" value={formData.duration_high ?? ''} onChange={e => setFormData(f => ({ ...f, duration_high: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Duration Med (Days)</Label>
                  <Input type="number" value={formData.duration_med ?? ''} onChange={e => setFormData(f => ({ ...f, duration_med: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Duration Low (Days)</Label>
                  <Input type="number" value={formData.duration_low ?? ''} onChange={e => setFormData(f => ({ ...f, duration_low: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="0" />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsFormOpen(false); setEditingActivity(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.activity || isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Saving...' : editingActivity ? 'Update Activity' : 'Add Activity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
