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
import { Plus, Edit3, Trash2, Search, FileText, Clock, Filter, ChevronDown, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [expandedPhases, setExpandedPhases] = useState<string[]>(ORA_PHASES.map(p => p.value));
  
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

  const getAreaBadge = (area: string) => {
    const variants: Record<string, string> = {
      ORM: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      FEO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      CSU: 'bg-orange-100 text-orange-700 border-orange-200'
    };
    return variants[area] || 'bg-muted text-muted-foreground';
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
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
            
            <Select value={filters.phase} onValueChange={(v) => setFilters(prev => ({ ...prev, phase: v }))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                {ORA_PHASES.map((phase) => (
                  <SelectItem key={phase.value} value={phase.value}>{phase.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.area} onValueChange={(v) => setFilters(prev => ({ ...prev, area: v }))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {ORA_AREAS.map((area) => (
                  <SelectItem key={area.value} value={area.value}>{area.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.entryType} onValueChange={(v) => setFilters(prev => ({ ...prev, entryType: v }))}>
              <SelectTrigger className="w-40">
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
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}

            <Button onClick={() => handleOpenForm()} className="ml-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        Showing {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
      </div>

      {/* Activities grouped by phase */}
      <div className="space-y-4">
        {ORA_PHASES.map((phase) => {
          const phaseActivities = activitiesByPhase[phase.value] || [];
          if (phaseActivities.length === 0 && filters.phase !== 'all' && filters.phase !== phase.value) return null;
          
          return (
            <Collapsible 
              key={phase.value} 
              open={expandedPhases.includes(phase.value)}
              onOpenChange={() => togglePhase(phase.value)}
            >
              <Card className="border-0 shadow-md overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{phase.label} Phase</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {phaseActivities.length} {phaseActivities.length === 1 ? 'activity' : 'activities'}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedPhases.includes(phase.value) ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-0">
                    {phaseActivities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No activities in this phase</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">ID</TableHead>
                            <TableHead className="w-16">Level</TableHead>
                            <TableHead className="w-16">Area</TableHead>
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
                                <Badge variant="outline" className="text-xs">{activity.level}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={getAreaBadge(activity.area)}>
                                  {activity.area}
                                </Badge>
                              </TableCell>
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
                                    onClick={() => handleOpenForm(activity)}
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
                  </CardContent>
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
              {editingActivity ? 'Edit Activity' : 'Add Activity'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {/* Row 1: Phase, Level, Area, Activity ID */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Phase *</Label>
                  <Select
                    value={formData.phase}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, phase: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
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
                          {area.value}
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
                    placeholder="e.g., 1.00"
                  />
                </div>
              </div>

              {/* Row 2: Name */}
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Activity or deliverable name"
                />
              </div>

              {/* Row 3: Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description"
                  rows={3}
                />
              </div>

              {/* Row 4: Entry Type, Requirement Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entry Type</Label>
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

              {/* Row 5: Discipline, Applicable Business, Est Hours */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Discipline</Label>
                  <Input
                    value={formData.discipline || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, discipline: e.target.value }))}
                    placeholder="e.g., Engineering"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Applicable Business</Label>
                  <Input
                    value={formData.applicable_business || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, applicable_business: e.target.value }))}
                    placeholder="All, DS, US, IG"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Hours</Label>
                  <Input
                    type="number"
                    value={formData.estimated_manhours || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_manhours: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="Hours"
                  />
                </div>
              </div>

              {/* Row 6: Outcome Evidence */}
              <div className="space-y-2">
                <Label>Outcome / Evidence</Label>
                <Input
                  value={formData.outcome_evidence || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, outcome_evidence: e.target.value }))}
                  placeholder="What document or evidence this produces"
                />
              </div>

              {/* Row 7: Rolled Up In Document (for scalable items) */}
              {formData.requirement_level === 'scalable' && (
                <div className="space-y-2">
                  <Label>Rolled Up In Document</Label>
                  <Input
                    value={formData.rolled_up_in_document || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, rolled_up_in_document: e.target.value }))}
                    placeholder="Document this can be rolled into"
                  />
                </div>
              )}

              {/* Row 8: DCAF Control Point, OR Toolbox Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>DCAF Control Point</Label>
                  <Input
                    value={formData.dcaf_control_point || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, dcaf_control_point: e.target.value }))}
                    placeholder="e.g., CP-01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>OR Toolbox Section</Label>
                  <Input
                    value={formData.or_toolbox_section || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, or_toolbox_section: e.target.value }))}
                    placeholder="Section reference"
                  />
                </div>
              </div>

              {/* Row 9: Tools/Templates */}
              <div className="space-y-2">
                <Label>Tools / Templates</Label>
                <Textarea
                  value={formData.tools_templates || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tools_templates: e.target.value }))}
                  placeholder="Associated tools and templates"
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
