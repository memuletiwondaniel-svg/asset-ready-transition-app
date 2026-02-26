import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit3, Trash2, Search, Copy, LayoutTemplate, Star, Layers, CheckCircle2 } from 'lucide-react';
import { useORAPlanTemplates, PROJECT_TYPES, COMPLEXITY_LEVELS, ORAPlanTemplate, ORAPlanTemplateInput } from '@/hooks/useORAPlanTemplates';
import { useORAActivityCatalog, useORPPhases, ORAActivity } from '@/hooks/useORAActivityCatalog';

export const ORATemplateManagement = () => {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, isCreating, isUpdating } = useORAPlanTemplates();
  const { activities } = useORAActivityCatalog();
  const { phases } = useORPPhases();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isActivitySelectorOpen, setIsActivitySelectorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ORAPlanTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedTemplateForActivities, setSelectedTemplateForActivities] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ORAPlanTemplateInput>({
    name: '',
    description: '',
    project_type: '',
    complexity: 'medium',
    applicable_phases: ['SELECT', 'DEFINE', 'EXECUTE'],
    is_active: true,
    is_default: false
  });

  const handleOpenForm = (template?: ORAPlanTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        project_type: template.project_type,
        complexity: template.complexity,
        applicable_phases: template.applicable_phases,
        is_active: template.is_active,
        is_default: template.is_default
      });
    } else {
      setEditingTemplate(null);
      setFormData({ name: '', description: '', project_type: '', complexity: 'medium', applicable_phases: ['SELECT', 'DEFINE', 'EXECUTE'], is_active: true, is_default: false });
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate.id, ...formData });
      } else {
        await createTemplate(formData);
      }
      setIsFormOpen(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const togglePhase = (phase: string) => {
    setFormData(prev => ({
      ...prev,
      applicable_phases: prev.applicable_phases?.includes(phase)
        ? prev.applicable_phases.filter(p => p !== phase)
        : [...(prev.applicable_phases || []), phase]
    }));
  };

  const getComplexityBadge = (complexity: string) => {
    const level = COMPLEXITY_LEVELS.find(l => l.value === complexity);
    return level?.color || 'bg-muted text-muted-foreground';
  };

  const filteredTemplates = templates.filter(t => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query) || t.project_type.toLowerCase().includes(query);
  });

  const templatesByType = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.project_type]) acc[template.project_type] = [];
    acc[template.project_type].push(template);
    return acc;
  }, {} as Record<string, ORAPlanTemplate[]>);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading templates...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">ORA Plan Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">Create reusable templates for different project types and complexities</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
          </div>
          <Button onClick={() => handleOpenForm()}><Plus className="h-4 w-4 mr-2" />Create Template</Button>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-1">No templates found</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first ORA plan template to get started</p>
            <Button onClick={() => handleOpenForm()}><Plus className="h-4 w-4 mr-2" />Create Template</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(templatesByType).map(([projectType, typeTemplates]) => (
            <div key={projectType}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4" />{projectType} Projects
                <Badge variant="secondary" className="text-xs">{typeTemplates.length}</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {typeTemplates.map((template) => (
                  <Card key={template.id} className={`relative overflow-hidden transition-all hover:shadow-md ${!template.is_active ? 'opacity-60' : ''}`}>
                    {template.is_default && <div className="absolute top-2 right-2"><Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /></div>}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-6">
                          <CardTitle className="text-base truncate">{template.name}</CardTitle>
                          {template.description && <CardDescription className="line-clamp-2 mt-1">{template.description}</CardDescription>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={getComplexityBadge(template.complexity)}>{template.complexity} complexity</Badge>
                          {!template.is_active && <Badge variant="outline" className="bg-muted">Inactive</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.applicable_phases.map((p) => <Badge key={p} variant="secondary" className="text-xs px-1.5 py-0">{p}</Badge>)}
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setSelectedTemplateForActivities(template.id); setIsActivitySelectorOpen(true); }}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Activities
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenForm(template)}><Edit3 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFormData({ name: `${template.name} (Copy)`, description: template.description || '', project_type: template.project_type, complexity: template.complexity, applicable_phases: template.applicable_phases, is_active: true, is_default: false }); setEditingTemplate(null); setIsFormOpen(true); }}><Copy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(template.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Template Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Standard Greenfield Project" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Type *</Label>
                <Select value={formData.project_type} onValueChange={(value) => setFormData(prev => ({ ...prev, project_type: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{PROJECT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Complexity</Label>
                <Select value={formData.complexity} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, complexity: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPLEXITY_LEVELS.map((level) => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Applicable Phases</Label>
              <div className="flex flex-wrap gap-2">
                {phases.map((p) => (
                  <Badge key={p.code} variant={formData.applicable_phases?.includes(p.code) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => togglePhase(p.code)}>
                    {p.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: !!checked }))} />
                <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="is_default" checked={formData.is_default} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: !!checked }))} />
                <Label htmlFor="is_default" className="cursor-pointer">Default template</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsFormOpen(false); setEditingTemplate(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.project_type || isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Selector Dialog - simplified since ora_template_activities table was removed */}
      <Dialog open={isActivitySelectorOpen} onOpenChange={() => { setIsActivitySelectorOpen(false); setSelectedTemplateForActivities(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Template Activities</DialogTitle></DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <p>Template activity linking will be available in a future update.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => { setIsActivitySelectorOpen(false); setSelectedTemplateForActivities(null); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this template? This action cannot be undone.</AlertDialogDescription>
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