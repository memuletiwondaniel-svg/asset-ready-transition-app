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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit3, Trash2, Search, ChevronDown, ChevronUp, X, Clock, Columns3, Check } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useORAActivityCatalog, ORA_PHASES, ORA_AREAS, ORA_ENTRY_TYPES, ORA_REQUIREMENT_LEVELS, ORAActivity, ORAActivityInput } from '@/hooks/useORAActivityCatalog';

export const ORAActivityCatalog = () => {
  const [filters, setFilters] = useState({
    phase: 'all',
    area: 'all',
    entryType: 'all',
    search: ''
  });
  
  const { activities, activitiesByPhase, isLoading, createActivity, updateActivity, deleteActivity, isCreating, isUpdating } = useORAActivityCatalog({
    phase: filters.phase !== 'all' ? filters.phase : undefined,
    area: filters.area !== 'all' ? filters.area : undefined,
    entryType: filters.entryType !== 'all' ? filters.entryType : undefined,
    search: filters.search || undefined
  });
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ORAActivity | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['type']);
  
  const [formData, setFormData] = useState<ORAActivityInput>({
    phase: '',
    level: 'L1',
    area: 'ORM',
    activity_id: '',
    entry_type: 'activity',
    requirement_level: 'mandatory',
    name: '',
    description: '',
    discipline: '',
    applicable_business: 'All',
    estimated_manhours: undefined,
    outcome_evidence: '',
    rolled_up_in_document: '',
    dcaf_control_point: '',
    pmf_controls: [],
    ams_processes: [],
    or_toolbox_section: '',
    tools_templates: ''
  });

  const handleOpenForm = (activity?: ORAActivity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        phase: activity.phase,
        level: activity.level,
        area: activity.area,
        activity_id: activity.activity_id,
        entry_type: activity.entry_type,
        requirement_level: activity.requirement_level,
        name: activity.name,
        description: activity.description || '',
        discipline: activity.discipline || '',
        applicable_business: activity.applicable_business || 'All',
        estimated_manhours: activity.estimated_manhours || undefined,
        outcome_evidence: activity.outcome_evidence || '',
        rolled_up_in_document: activity.rolled_up_in_document || '',
        dcaf_control_point: activity.dcaf_control_point || '',
        pmf_controls: activity.pmf_controls || [],
        ams_processes: activity.ams_processes || [],
        or_toolbox_section: activity.or_toolbox_section || '',
        tools_templates: activity.tools_templates || ''
      });
    } else {
      setEditingActivity(null);
      setFormData({
        phase: '',
        level: 'L1',
        area: 'ORM',
        activity_id: '',
        entry_type: 'activity',
        requirement_level: 'mandatory',
        name: '',
        description: '',
        discipline: '',
        applicable_business: 'All',
        estimated_manhours: undefined,
        outcome_evidence: ''
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingActivity(null);
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

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => 
      prev.includes(phase) 
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    );
  };

  const expandAll = () => setExpandedPhases(ORA_PHASES.map(p => p.value));
  const collapseAll = () => setExpandedPhases([]);

  const getTypeBadgeColor = (type: string) => {
    return type === 'deliverable' 
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  const clearFilters = () => {
    setFilters({ phase: 'all', area: 'all', entryType: 'all', search: '' });
  };

  const hasActiveFilters = filters.phase !== 'all' || filters.area !== 'all' || filters.entryType !== 'all' || filters.search;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading activity catalog...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-end bg-card p-3 rounded-lg border">
        <Button onClick={() => handleOpenForm()} size="sm" className="h-9">
          <Plus className="h-4 w-4 mr-1" />
          Add Activity
        </Button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No activities yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          The activity catalog is empty. Click "Add Activity" to start building your ORA activity catalog.
        </p>
      </div>

      {/* Add/Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? 'Edit Activity' : 'Add New Activity'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {/* Row 1: Phase, Activity ID */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phase *</Label>
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
                  <Label>Activity ID *</Label>
                  <Input
                    value={formData.activity_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, activity_id: e.target.value }))}
                    placeholder="e.g. SELECT-1"
                  />
                </div>
              </div>

              {/* Row 2: Name */}
              <div className="space-y-2">
                <Label>Activity Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter activity name"
                />
              </div>

              {/* Row 3: Type, Level, Area */}
              <div className="grid grid-cols-3 gap-4">
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
                  <Label>Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L1">L1</SelectItem>
                      <SelectItem value="L2">L2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Area</Label>
                  <Select
                    value={formData.area}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, area: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORA_AREAS.map((area) => (
                        <SelectItem key={area.value} value={area.value}>
                          {area.value} - {area.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 4: Requirement Level, Estimated Hours */}
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>Estimated Man-Hours</Label>
                  <Input
                    type="number"
                    value={formData.estimated_manhours || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      estimated_manhours: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              {/* Row 5: Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter activity description"
                  rows={4}
                />
              </div>

              {/* Row 6: Outcome Evidence */}
              <div className="space-y-2">
                <Label>Outcome Evidence</Label>
                <Textarea
                  value={formData.outcome_evidence}
                  onChange={(e) => setFormData(prev => ({ ...prev, outcome_evidence: e.target.value }))}
                  placeholder="What evidence demonstrates completion?"
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.phase || !formData.activity_id || !formData.name || isCreating || isUpdating}
            >
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
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
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
