import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit3, Trash2, Search, Copy, LayoutTemplate, Star, Layers, Sparkles, FileText, Settings2 } from 'lucide-react';
import { useORAPlanTemplates, PROJECT_TYPES, COMPLEXITY_LEVELS, ORAPlanTemplate, ORAPlanTemplateInput } from '@/hooks/useORAPlanTemplates';
import { useORPPhases } from '@/hooks/useORAActivityCatalog';
import { cn } from '@/lib/utils';

export const ORATemplateManagement = () => {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, isCreating, isUpdating } = useORAPlanTemplates();
  const { phases } = useORPPhases();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ORAPlanTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<ORAPlanTemplate | null>(null);

  const [formData, setFormData] = useState<ORAPlanTemplateInput>({
    name: '', description: '', project_type: '', complexity: 'medium',
    applicable_phases: ['SELECT', 'DEFINE', 'EXECUTE'], is_active: true, is_default: false
  });

  const handleOpenForm = (template?: ORAPlanTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name, description: template.description || '',
        project_type: template.project_type, complexity: template.complexity,
        applicable_phases: template.applicable_phases, is_active: template.is_active, is_default: template.is_default
      });
    } else {
      setEditingTemplate(null);
      setFormData({ name: '', description: '', project_type: '', complexity: 'medium', applicable_phases: ['SELECT', 'DEFINE', 'EXECUTE'], is_active: true, is_default: false });
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) await updateTemplate({ id: editingTemplate.id, ...formData });
      else await createTemplate(formData);
      setIsFormOpen(false);
      setEditingTemplate(null);
    } catch (error) { console.error('Error saving template:', error); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteTemplate(id); setDeleteConfirmId(null); }
    catch (error) { console.error('Error deleting template:', error); }
  };

  const handleCopy = (template: ORAPlanTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`, description: template.description || '',
      project_type: template.project_type, complexity: template.complexity,
      applicable_phases: template.applicable_phases, is_active: true, is_default: false
    });
    setEditingTemplate(null);
    setIsFormOpen(true);
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
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.project_type.toLowerCase().includes(q);
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
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">ORA Plan Templates</h2>
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
          <div className="flex flex-col items-center justify-center py-12">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-1">No templates found</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first ORA plan template to get started</p>
            <Button onClick={() => handleOpenForm()}><Plus className="h-4 w-4 mr-2" />Create Template</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => setViewingTemplate(template)}
              className={cn(
                "group relative h-56 flex flex-col rounded-lg border bg-card p-5 cursor-pointer transition-all duration-200",
                "hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5",
                !template.is_active && 'opacity-60'
              )}
            >
              {/* Hover-only action icons (top-right) */}
              <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 backdrop-blur-sm rounded-md border shadow-sm p-0.5 z-10">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleOpenForm(template); }}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleCopy(template); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(template.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Project type pill */}
              <div className="flex items-center gap-1.5 mb-2">
                {template.is_default && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0">
                  {template.project_type}
                </Badge>
              </div>

              <h4 className="font-semibold text-base leading-snug line-clamp-1 pr-16">{template.name}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1 flex-1">
                {template.description || 'No description provided.'}
              </p>

              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={getComplexityBadge(template.complexity)}>{template.complexity}</Badge>
                  {!template.is_active && <Badge variant="outline" className="bg-muted">Inactive</Badge>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.applicable_phases.filter(p => ['ASSESS', 'SELECT', 'DEFINE', 'EXECUTE'].includes(p)).map((p) => (
                    <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">{p}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* View Template Modal */}
      <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && setViewingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          {viewingTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <LayoutTemplate className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="flex items-center gap-2">
                      {viewingTemplate.name}
                      {viewingTemplate.is_default && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {viewingTemplate.description || 'No description provided.'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Project Type</Label>
                    <p className="text-sm font-medium mt-1">{viewingTemplate.project_type}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Complexity</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className={getComplexityBadge(viewingTemplate.complexity)}>
                        {viewingTemplate.complexity}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Applicable Phases</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {viewingTemplate.applicable_phases.map((p) => (
                      <Badge key={p} variant="secondary">{p}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="text-sm mt-1">{viewingTemplate.is_active ? 'Active' : 'Inactive'}{viewingTemplate.is_default && ' · Default template'}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewingTemplate(null)}>Close</Button>
                <Button onClick={() => { handleOpenForm(viewingTemplate); setViewingTemplate(null); }}>
                  <Edit3 className="h-4 w-4 mr-2" />Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Template Dialog - Modern Redesign */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          {/* Hero header */}
          <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-5 border-b">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {editingTemplate ? 'Edit Template' : 'New Template'}
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  {editingTemplate ? 'Update template details and configuration.' : 'Define a reusable ORA plan blueprint.'}
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Basics */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <FileText className="h-3.5 w-3.5" /> Basics
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name">Template Name <span className="text-destructive">*</span></Label>
                <Input id="tpl-name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Standard Greenfield Project" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-desc">Description</Label>
                <Textarea id="tpl-desc" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="What is this template used for?" rows={2} />
              </div>
            </section>

            {/* Classification */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Layers className="h-3.5 w-3.5" /> Classification
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Project Type <span className="text-destructive">*</span></Label>
                  <Select value={formData.project_type} onValueChange={(value) => setFormData(prev => ({ ...prev, project_type: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{PROJECT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Complexity</Label>
                  <Select value={formData.complexity} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, complexity: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COMPLEXITY_LEVELS.map((level) => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Applicable Phases</Label>
                <div className="flex flex-wrap gap-2">
                  {phases.filter(p => ['ASSESS', 'SELECT', 'DEFINE', 'EXECUTE'].includes(p.code)).map((p) => {
                    const active = formData.applicable_phases?.includes(p.code);
                    const phaseColors: Record<string, { active: string; inactive: string }> = {
                      ASSESS:  { active: 'bg-amber-500 text-white border-amber-500 shadow-sm hover:bg-amber-600',   inactive: 'text-amber-700 dark:text-amber-400 border-amber-300/60 dark:border-amber-700/60 hover:bg-amber-500/10' },
                      SELECT:  { active: 'bg-purple-500 text-white border-purple-500 shadow-sm hover:bg-purple-600', inactive: 'text-purple-700 dark:text-purple-400 border-purple-300/60 dark:border-purple-700/60 hover:bg-purple-500/10' },
                      DEFINE:  { active: 'bg-teal-500 text-white border-teal-500 shadow-sm hover:bg-teal-600',       inactive: 'text-teal-700 dark:text-teal-400 border-teal-300/60 dark:border-teal-700/60 hover:bg-teal-500/10' },
                      EXECUTE: { active: 'bg-blue-500 text-white border-blue-500 shadow-sm hover:bg-blue-600',       inactive: 'text-blue-700 dark:text-blue-400 border-blue-300/60 dark:border-blue-700/60 hover:bg-blue-500/10' },
                    };
                    const c = phaseColors[p.code];
                    return (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => togglePhase(p.code)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all bg-background",
                          active ? c.active : c.inactive
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Settings */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Settings2 className="h-3.5 w-3.5" /> Settings
              </div>
              <div className="rounded-lg border divide-y">
                <div className="flex items-center justify-between p-3">
                  <div>
                    <Label htmlFor="tpl-active" className="text-sm font-medium cursor-pointer">Active</Label>
                    <p className="text-xs text-muted-foreground">Available for selection in new ORA plans.</p>
                  </div>
                  <Switch id="tpl-active" checked={formData.is_active} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} />
                </div>
                <div className="flex items-center justify-between p-3">
                  <div>
                    <Label htmlFor="tpl-default" className="text-sm font-medium cursor-pointer">Default template</Label>
                    <p className="text-xs text-muted-foreground">Pre-selected for this project type.</p>
                  </div>
                  <Switch id="tpl-default" checked={formData.is_default} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))} />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button variant="outline" onClick={() => { setIsFormOpen(false); setEditingTemplate(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.project_type || isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
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
