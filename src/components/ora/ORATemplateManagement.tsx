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
import { useORPPhases, useORAActivityCatalog } from '@/hooks/useORAActivityCatalog';
import { cn } from '@/lib/utils';

export const ORATemplateManagement = () => {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, isCreating, isUpdating } = useORAPlanTemplates();
  const { phases } = useORPPhases();
  const { activities, createActivity, deleteActivity, isCreating: isCreatingActivity } = useORAActivityCatalog();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ORAPlanTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<ORAPlanTemplate | null>(null);
  const [viewEditForm, setViewEditForm] = useState<ORAPlanTemplateInput | null>(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [addActivityPhase, setAddActivityPhase] = useState<string | null>(null);
  const [newActivityName, setNewActivityName] = useState('');
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);

  const [formData, setFormData] = useState<ORAPlanTemplateInput>({
    name: '', description: '', project_type: '', complexity: 'medium',
    applicable_phases: ['SELECT', 'DEFINE', 'EXECUTE'], is_active: true, is_default: false
  });

  const openViewing = (template: ORAPlanTemplate) => {
    setViewingTemplate(template);
    setViewEditForm({
      name: template.name,
      description: template.description || '',
      project_type: template.project_type,
      complexity: template.complexity,
      applicable_phases: template.applicable_phases,
      is_active: template.is_active,
      is_default: template.is_default,
    });
  };

  const closeViewing = () => {
    setViewingTemplate(null);
    setViewEditForm(null);
    setAddActivityPhase(null);
    setNewActivityName('');
  };

  const isViewDirty = !!(viewingTemplate && viewEditForm && (
    viewEditForm.name !== viewingTemplate.name ||
    (viewEditForm.description || '') !== (viewingTemplate.description || '') ||
    viewEditForm.project_type !== viewingTemplate.project_type ||
    viewEditForm.complexity !== viewingTemplate.complexity ||
    viewEditForm.is_active !== viewingTemplate.is_active
  ));

  const handleConfirmedSave = async () => {
    if (!viewingTemplate || !viewEditForm) return;
    try {
      await updateTemplate({ id: viewingTemplate.id, ...viewEditForm });
      setConfirmSaveOpen(false);
      closeViewing();
    } catch (e) { console.error(e); }
  };

  // Display ASS-01 → A.01, SEL-01 → S.01, etc.
  const formatActivityCode = (code: string) => {
    if (!code) return code;
    const m = code.match(/^([A-Za-z]+)[.\-]?(.*)$/);
    if (!m) return code;
    const map: Record<string, string> = { ASS: 'A', SEL: 'S', DEF: 'D', EXE: 'E', IDN: 'I', OPR: 'O' };
    const prefix = map[m[1].toUpperCase()] || m[1].charAt(0).toUpperCase();
    const rest = m[2].replace(/^[.\-]/, '');
    return `${prefix}.${rest}`;
  };

  const handleAddActivity = async (phaseCode: string) => {
    const phase = phases.find(p => p.code === phaseCode);
    if (!phase || !newActivityName.trim()) return;
    try {
      await createActivity({ activity: newActivityName.trim(), phase_id: phase.id });
      setNewActivityName('');
      setAddActivityPhase(null);
    } catch (e) { console.error(e); }
  };

  const handleDeleteActivity = async () => {
    if (!deleteActivityId) return;
    try { await deleteActivity(deleteActivityId); setDeleteActivityId(null); }
    catch (e) { console.error(e); }
  };

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
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2"><LayoutTemplate className="h-5 w-5 text-primary" />ORA Plan Templates</h2>
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
              onClick={() => openViewing(template)}
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
      <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && closeViewing()}>
        <DialogContent className="max-w-3xl w-[90vw] h-[85vh] max-h-[85vh] p-0 flex flex-col overflow-hidden">
          {viewingTemplate && viewEditForm && (() => {
            const allowed = viewEditForm.applicable_phases!.filter(p => ['ASSESS', 'SELECT', 'DEFINE', 'EXECUTE'].includes(p));
            const phaseByCode = Object.fromEntries(phases.map(p => [p.code, p]));
            const phaseIdToCode = Object.fromEntries(phases.map(p => [p.id, p.code]));
            const phaseColors: Record<string, string> = {
              ASSESS:  'border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-400',
              SELECT:  'border-purple-300/60 bg-purple-500/10 text-purple-700 dark:text-purple-400',
              DEFINE:  'border-teal-300/60 bg-teal-500/10 text-teal-700 dark:text-teal-400',
              EXECUTE: 'border-blue-300/60 bg-blue-500/10 text-blue-700 dark:text-blue-400',
            };
            const activitiesByPhase: Record<string, typeof activities> = {};
            allowed.forEach(code => { activitiesByPhase[code] = []; });
            (activities || []).forEach(a => {
              const code = a.phase_id ? phaseIdToCode[a.phase_id] : undefined;
              if (code && activitiesByPhase[code]) activitiesByPhase[code].push(a);
            });
            return (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <LayoutTemplate className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Input
                        value={viewEditForm.name}
                        onChange={(e) => setViewEditForm(prev => prev ? { ...prev, name: e.target.value } : prev)}
                        className="text-lg font-semibold border-transparent hover:border-input focus-visible:border-input px-2 -ml-2 h-9 bg-transparent"
                        placeholder="Template name"
                      />
                      <Textarea
                        value={viewEditForm.description || ''}
                        onChange={(e) => setViewEditForm(prev => prev ? { ...prev, description: e.target.value } : prev)}
                        className="text-sm text-muted-foreground border-transparent hover:border-input focus-visible:border-input px-2 -ml-2 min-h-0 py-1 resize-none bg-transparent"
                        placeholder="Add a description..."
                        rows={1}
                      />
                    </div>
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto scrollbar-auto-hide px-6 py-4 space-y-5">
                  {/* Meta grid - editable */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Project Type</Label>
                      <Select
                        value={viewEditForm.project_type}
                        onValueChange={(v) => setViewEditForm(prev => prev ? { ...prev, project_type: v } : prev)}
                      >
                        <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Complexity</Label>
                      <Select
                        value={viewEditForm.complexity}
                        onValueChange={(v: 'low' | 'medium' | 'high') => setViewEditForm(prev => prev ? { ...prev, complexity: v } : prev)}
                      >
                        <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{COMPLEXITY_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select
                        value={viewEditForm.is_active ? 'active' : 'inactive'}
                        onValueChange={(v) => setViewEditForm(prev => prev ? { ...prev, is_active: v === 'active' } : prev)}
                      >
                        <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Activities by phase */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold">Activities</Label>
                      <span className="text-xs text-muted-foreground">
                        {Object.values(activitiesByPhase).reduce((s, a) => s + a.length, 0)} total
                      </span>
                    </div>
                    <div className="space-y-4">
                      {allowed.map(code => {
                        const phase = phaseByCode[code];
                        const acts = activitiesByPhase[code] || [];
                        return (
                          <div key={code} className="rounded-lg border overflow-hidden">
                            <div className={cn("flex items-center justify-between px-3 py-2 border-b", phaseColors[code])}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide">{phase?.label || code}</span>
                                <Badge variant="outline" className="bg-background/60 text-[10px]">{acts.length}</Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => { setAddActivityPhase(code); setNewActivityName(''); }}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />Add
                              </Button>
                            </div>
                            {addActivityPhase === code && (
                              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                                <Input
                                  autoFocus
                                  value={newActivityName}
                                  onChange={(e) => setNewActivityName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddActivity(code); if (e.key === 'Escape') { setAddActivityPhase(null); setNewActivityName(''); } }}
                                  placeholder="New activity name..."
                                  className="h-8 text-sm"
                                />
                                <Button size="sm" className="h-8" disabled={!newActivityName.trim() || isCreatingActivity} onClick={() => handleAddActivity(code)}>Add</Button>
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddActivityPhase(null); setNewActivityName(''); }}>Cancel</Button>
                              </div>
                            )}
                            {acts.length === 0 ? (
                              <div className="px-3 py-4 text-xs text-muted-foreground text-center">No activities in catalog for this phase.</div>
                            ) : (
                              <ul className="divide-y">
                                {acts.map(a => (
                                  <li key={a.id} className="group/act flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40">
                                    <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-14">{formatActivityCode(a.activity_code)}</span>
                                    <span className="flex-1 min-w-0 truncate">{a.activity}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive opacity-0 group-hover/act:opacity-100 transition-opacity"
                                      onClick={() => setDeleteActivityId(a.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                  <Button variant="outline" onClick={closeViewing}>Close</Button>
                  <Button
                    disabled={!isViewDirty || !viewEditForm.name || !viewEditForm.project_type || isUpdating}
                    onClick={() => setConfirmSaveOpen(true)}
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirm Save Changes */}
      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes?</AlertDialogTitle>
            <AlertDialogDescription>Your changes to this template will be applied. Continue?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSave}>Save Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Activity */}
      <AlertDialog open={!!deleteActivityId} onOpenChange={(open) => !open && setDeleteActivityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>This will remove the activity from the catalog. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteActivity} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



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
