import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit3, Trash2, Search } from 'lucide-react';
import { useORAActivityCatalog, useORPPhases, ORAActivity, ORAActivityInput } from '@/hooks/useORAActivityCatalog';
import { ActivityFormDialog } from './ActivityFormDialog';

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

  const handleOpenForm = (activity?: ORAActivity) => {
    setEditingActivity(activity || null);
    setIsFormOpen(true);
  };

  const handleSave = async (payload: ORAActivityInput) => {
    try {
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
      <ActivityFormDialog
        open={isFormOpen}
        onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingActivity(null); }}
        editingActivity={editingActivity}
        phases={phases}
        activities={activities}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />

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
