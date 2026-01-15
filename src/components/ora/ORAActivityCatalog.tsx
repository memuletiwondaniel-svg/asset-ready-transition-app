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
      {/* Compact Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-8 h-9"
          />
        </div>
        
        <Select value={filters.phase} onValueChange={(v) => setFilters(prev => ({ ...prev, phase: v }))}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {ORA_PHASES.map((phase) => (
              <SelectItem key={phase.value} value={phase.value}>{phase.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.entryType} onValueChange={(v) => setFilters(prev => ({ ...prev, entryType: v }))}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ORA_ENTRY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Columns3 className="h-4 w-4 mr-1" />
                Columns
                {visibleColumns.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {visibleColumns.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Toggle columns</p>
                {[
                  { id: 'description', label: 'Description' },
                  { id: 'hours', label: 'Hours' },
                  { id: 'type', label: 'Type' }
                ].map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={visibleColumns.includes(col.id)}
                      onCheckedChange={(checked) => {
                        setVisibleColumns(prev =>
                          checked
                            ? [...prev, col.id]
                            : prev.filter(c => c !== col.id)
                        );
                      }}
                    />
                    <span className="text-sm">{col.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={expandAll} className="h-9">
            <ChevronDown className="h-4 w-4 mr-1" />
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="h-9">
            <ChevronUp className="h-4 w-4 mr-1" />
            Collapse
          </Button>
          <Button onClick={() => handleOpenForm()} size="sm" className="h-9">
            <Plus className="h-4 w-4 mr-1" />
            Add Activity
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground px-1">
        {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
      </p>

      {/* Simplified Phase Tables */}
      <div className="space-y-3">
        {ORA_PHASES.map((phase) => {
          const phaseActivities = activitiesByPhase[phase.value] || [];
          if (phaseActivities.length === 0 && filters.phase !== 'all' && filters.phase !== phase.value) return null;
          
          return (
            <Collapsible 
              key={phase.value} 
              open={expandedPhases.includes(phase.value)}
              onOpenChange={() => togglePhase(phase.value)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{phase.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {phaseActivities.length}
                      </Badge>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedPhases.includes(phase.value) ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {phaseActivities.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No activities in this phase
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-16">S/N</TableHead>
                          <TableHead>Activity</TableHead>
                          {visibleColumns.includes('description') && <TableHead className="min-w-[200px]">Description</TableHead>}
                          {visibleColumns.includes('type') && <TableHead className="w-28">Type</TableHead>}
                          {visibleColumns.includes('hours') && <TableHead className="w-24">Hours</TableHead>}
                          <TableHead className="w-20 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {phaseActivities.map((activity) => (
                          <TableRow key={activity.id} className="group">
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {activity.display_order}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">{activity.name}</p>
                            </TableCell>
                            {visibleColumns.includes('description') && (
                              <TableCell className="text-sm text-muted-foreground max-w-[300px]">
                                <p className="line-clamp-2">{activity.description || '—'}</p>
                              </TableCell>
                            )}
                            {visibleColumns.includes('type') && (
                              <TableCell>
                                <Badge variant="outline" className={`text-xs capitalize ${getTypeBadgeColor(activity.entry_type)}`}>
                                  {activity.entry_type.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                            )}
                            {visibleColumns.includes('hours') && (
                              <TableCell className="text-sm text-muted-foreground">
                                {activity.estimated_manhours ? (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {activity.estimated_manhours}
                                  </span>
                                ) : '—'}
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleOpenForm(activity)}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteConfirmId(activity.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
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
