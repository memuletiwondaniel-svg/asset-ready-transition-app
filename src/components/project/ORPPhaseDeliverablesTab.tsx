import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Edit3, Trash2, Search, FileText } from 'lucide-react';
import { useORAActivityCatalog, useORPPhases, ORAActivity, ORAActivityInput } from '@/hooks/useORAActivityCatalog';

export const ORPPhaseDeliverablesTab = () => {
  const { activities, isLoading, createActivity, updateActivity, deleteActivity, isCreating, isUpdating } = useORAActivityCatalog();
  const { phases } = useORPPhases();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ORAActivity | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ORAActivityInput>({
    activity: '',
    description: '',
    phase_id: '',
    duration_high: undefined,
    duration_med: undefined,
    duration_low: undefined,
  });

  // Group activities by phase
  const activitiesByPhase = activities.reduce((acc, activity) => {
    const phaseId = activity.phase_id || 'unassigned';
    if (!acc[phaseId]) acc[phaseId] = [];
    acc[phaseId].push(activity);
    return acc;
  }, {} as Record<string, ORAActivity[]>);

  const handleOpenForm = (phaseId?: string, activity?: ORAActivity) => {
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
      setFormData({ activity: '', description: '', phase_id: phaseId || '', duration_high: undefined, duration_med: undefined, duration_low: undefined });
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData };
      if (!payload.phase_id) delete payload.phase_id;
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

  const filterActivities = (acts: ORAActivity[]) => {
    if (!searchQuery) return acts;
    const query = searchQuery.toLowerCase();
    return acts.filter(a => a.activity.toLowerCase().includes(query) || a.description?.toLowerCase().includes(query) || a.activity_code.toLowerCase().includes(query));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading ORP phases...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">ORP Phases & Deliverables</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage master deliverables and activities for each ORP phase</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search deliverables..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
          </div>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {phases.map((phase) => {
          const phaseActivities = filterActivities(activitiesByPhase[phase.id] || []);
          const totalCount = (activitiesByPhase[phase.id] || []).length;
          
          return (
            <AccordionItem key={phase.id} value={phase.id} className="border rounded-lg bg-card/50 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">{phase.label} Phase</h3>
                      <p className="text-xs text-muted-foreground">{totalCount} {totalCount === 1 ? 'item' : 'items'}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleOpenForm(phase.id); }}>
                    <Plus className="h-4 w-4 mr-1" />Add
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {phaseActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No deliverables in this phase</p>
                    <Button variant="link" className="mt-2" onClick={() => handleOpenForm(phase.id)}>Add the first one</Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Code</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead className="w-20 text-center">High</TableHead>
                        <TableHead className="w-20 text-center">Med</TableHead>
                        <TableHead className="w-20 text-center">Low</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {phaseActivities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="font-mono text-xs">{activity.activity_code}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{activity.activity}</p>
                              {activity.description && <p className="text-xs text-muted-foreground line-clamp-1">{activity.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{activity.duration_high ?? '-'}</TableCell>
                          <TableCell className="text-center">{activity.duration_med ?? '-'}</TableCell>
                          <TableCell className="text-center">{activity.duration_low ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenForm(phase.id, activity)}><Edit3 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(activity.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Add/Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingActivity ? 'Edit Activity' : 'Add Activity'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {editingActivity && (
              <div className="space-y-2">
                <Label>Activity Code</Label>
                <Input value={editingActivity.activity_code} disabled className="bg-muted" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Phase</Label>
              <Select value={formData.phase_id || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, phase_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger>
                <SelectContent>{phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Activity *</Label>
              <Input value={formData.activity} onChange={(e) => setFormData(prev => ({ ...prev, activity: e.target.value }))} placeholder="Activity name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description" rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Duration High (Days)</Label>
                <Input type="number" value={formData.duration_high ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, duration_high: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Duration Med (Days)</Label>
                <Input type="number" value={formData.duration_med ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, duration_med: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Duration Low (Days)</Label>
                <Input type="number" value={formData.duration_low ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, duration_low: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsFormOpen(false); setEditingActivity(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.activity || isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Saving...' : editingActivity ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this activity? This action cannot be undone.</AlertDialogDescription>
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