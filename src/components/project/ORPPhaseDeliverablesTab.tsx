import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Edit3, Trash2, Search, FileText, Clock, CheckCircle } from 'lucide-react';
import { useORAActivityCatalog, ORA_PHASES, ORA_ENTRY_TYPES, ORA_REQUIREMENT_LEVELS, ORAActivity, ORAActivityInput } from '@/hooks/useORAActivityCatalog';

export const ORPPhaseDeliverablesTab = () => {
  const { activitiesByPhase, isLoading, createActivity, updateActivity, deleteActivity, isCreating, isUpdating } = useORAActivityCatalog();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ORAActivity | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  
  const [formData, setFormData] = useState<ORAActivityInput>({
    phase: '',
    activity_id: '',
    name: '',
    entry_type: 'deliverable',
    requirement_level: 'mandatory',
    description: '',
    estimated_manhours: undefined,
    outcome_evidence: ''
  });

  const handleOpenForm = (phase?: string, activity?: ORAActivity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        phase: activity.phase,
        activity_id: activity.activity_id,
        name: activity.name,
        entry_type: activity.entry_type,
        requirement_level: activity.requirement_level,
        description: activity.description || '',
        estimated_manhours: activity.estimated_manhours || undefined,
        outcome_evidence: activity.outcome_evidence || '',
        discipline: activity.discipline || ''
      });
    } else {
      setEditingActivity(null);
      setFormData({
        phase: phase || '',
        activity_id: '',
        name: '',
        entry_type: 'deliverable',
        requirement_level: 'mandatory',
        description: '',
        estimated_manhours: undefined,
        outcome_evidence: ''
      });
    }
    setSelectedPhase(phase || '');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingActivity(null);
    setFormData({
      phase: '',
      activity_id: '',
      name: '',
      entry_type: 'deliverable',
      requirement_level: 'mandatory'
    });
  };

  const handleSave = async () => {
    try {
      if (editingActivity) {
        await updateActivity({ id: editingActivity.id, ...formData });
      } else {
        await createActivity(formData);
      }
      handleCloseForm();
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

  const getEntryTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      activity: 'bg-blue-100 text-blue-700 border-blue-200',
      critical_task: 'bg-red-100 text-red-700 border-red-200',
      control_point: 'bg-purple-100 text-purple-700 border-purple-200',
      deliverable: 'bg-green-100 text-green-700 border-green-200'
    };
    return variants[type] || 'bg-muted text-muted-foreground';
  };

  const getRequirementBadge = (level: string) => {
    const variants: Record<string, string> = {
      mandatory: 'bg-red-50 text-red-600 border-red-200',
      optional: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      scalable: 'bg-blue-50 text-blue-600 border-blue-200'
    };
    return variants[level] || 'bg-muted text-muted-foreground';
  };

  const filterActivities = (activities: ORAActivity[]) => {
    if (!searchQuery) return activities;
    const query = searchQuery.toLowerCase();
    return activities.filter(a => 
      a.name.toLowerCase().includes(query) || 
      a.description?.toLowerCase().includes(query) ||
      a.activity_id.toLowerCase().includes(query)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading ORP phases...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">ORP Phases & Deliverables</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage master deliverables and activities for each ORP phase
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

      {/* Phase Accordion */}
      <Accordion type="multiple" className="space-y-3">
        {ORA_PHASES.map((phase) => {
          const phaseActivities = filterActivities(activitiesByPhase[phase.value] || []);
          const totalCount = activitiesByPhase[phase.value]?.length || 0;
          
          return (
            <AccordionItem 
              key={phase.value} 
              value={phase.value}
              className="border rounded-lg bg-card/50 overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">{phase.label} Phase</h3>
                      <p className="text-xs text-muted-foreground">
                        {totalCount} {totalCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenForm(phase.value);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {phaseActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No deliverables in this phase</p>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => handleOpenForm(phase.value)}
                    >
                      Add the first one
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-28">Type</TableHead>
                        <TableHead className="w-28">Requirement</TableHead>
                        <TableHead className="w-24">Est. Hours</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {phaseActivities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="font-mono text-xs">{activity.activity_id}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{activity.name}</p>
                              {activity.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{activity.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getEntryTypeBadge(activity.entry_type)}>
                              {activity.entry_type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getRequirementBadge(activity.requirement_level)}>
                              {activity.requirement_level}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {activity.estimated_manhours ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3" />
                                {activity.estimated_manhours}h
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenForm(phase.value, activity)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirmId(activity.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? 'Edit Deliverable' : 'Add Deliverable'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phase</Label>
                <Select
                  value={formData.phase}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, phase: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORA_PHASES.map((phase) => (
                      <SelectItem key={phase.value} value={phase.value}>
                        {phase.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Activity ID</Label>
                <Input
                  value={formData.activity_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, activity_id: e.target.value }))}
                  placeholder="e.g., 1.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Deliverable name"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.entry_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, entry_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORA_ENTRY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Requirement Level</Label>
                <Select
                  value={formData.requirement_level}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, requirement_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORA_REQUIREMENT_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Hours</Label>
                <Input
                  type="number"
                  value={formData.estimated_manhours || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_manhours: e.target.value ? parseInt(e.target.value) : undefined }))}
                  placeholder="Hours"
                />
              </div>
              <div className="space-y-2">
                <Label>Discipline</Label>
                <Input
                  value={formData.discipline || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, discipline: e.target.value }))}
                  placeholder="e.g., Engineering"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Outcome/Evidence</Label>
              <Input
                value={formData.outcome_evidence || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, outcome_evidence: e.target.value }))}
                placeholder="What document or evidence this produces"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.name || !formData.phase || !formData.activity_id || isCreating || isUpdating}
            >
              {isCreating || isUpdating ? 'Saving...' : editingActivity ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deliverable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deliverable? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
