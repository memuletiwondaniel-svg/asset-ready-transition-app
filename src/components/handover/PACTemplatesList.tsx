import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, LayoutTemplate, Search, PlusCircle } from 'lucide-react';
import { usePACTemplates, usePACPrerequisites, usePACCategories, PACTemplate } from '@/hooks/useHandoverPrerequisites';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

const PACTemplatesList: React.FC = () => {
  const { data: templates, isLoading, createTemplate, updateTemplate, deleteTemplate, isCreating, isUpdating } = usePACTemplates();
  const { data: prerequisites, createPrerequisite, isCreating: isCreatingPrereq } = usePACPrerequisites();
  const { data: categories } = usePACCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PACTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prerequisite_ids: [] as string[],
    is_active: true,
  });
  const [customPrereqDialogOpen, setCustomPrereqDialogOpen] = useState(false);
  const [newPrereqData, setNewPrereqData] = useState({
    category_id: '',
    summary: '',
    description: '',
  });

  const filteredTemplates = templates?.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleOpenDialog = (template?: PACTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        prerequisite_ids: template.prerequisite_ids || [],
        is_active: template.is_active,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        prerequisite_ids: [],
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplate({ id: editingTemplate.id, ...formData });
    } else {
      createTemplate(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
    }
  };

  const togglePrerequisite = (prereqId: string) => {
    setFormData(prev => ({
      ...prev,
      prerequisite_ids: prev.prerequisite_ids.includes(prereqId)
        ? prev.prerequisite_ids.filter(id => id !== prereqId)
        : [...prev.prerequisite_ids, prereqId]
    }));
  };

  const handleCreateAndAddPrereq = () => {
    if (!newPrereqData.category_id || !newPrereqData.summary.trim()) return;
    
    createPrerequisite({
      category_id: newPrereqData.category_id,
      summary: newPrereqData.summary.trim(),
      description: newPrereqData.description.trim() || null,
      sample_evidence: null,
      delivering_party_role_id: null,
      receiving_party_role_id: null,
      display_order: (prerequisites?.length || 0) + 1,
      is_active: true,
    }, {
      onSuccess: (data: any) => {
        setFormData(prev => ({
          ...prev,
          prerequisite_ids: [...prev.prerequisite_ids, data.id]
        }));
        setNewPrereqData({ category_id: '', summary: '', description: '' });
        setCustomPrereqDialogOpen(false);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5" />
                PAC Templates
              </CardTitle>
              <CardDescription>
                Create and manage templates for different project scope types (e.g., Pipeline Handover, New Plant Handover)
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates found</p>
              <p className="text-sm">Create a template to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Prerequisites</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map(template => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {template.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {template.prerequisite_ids?.length || 0} items
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(template)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template.id)}
                          className="text-destructive hover:text-destructive"
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
      </Card>

      {/* Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Configure a PAC template with selected prerequisites
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Pipeline Handover"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when this template should be used..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Select Prerequisites</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose which prerequisites should be included in this template
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setCustomPrereqDialogOpen(true)}
                >
                  <PlusCircle className="h-4 w-4" />
                  Create New
                </Button>
              </div>
              <ScrollArea className="h-64 border rounded-md p-4">
                <div className="space-y-3">
                  {prerequisites?.map(prereq => (
                    <div key={prereq.id} className="flex items-start gap-3">
                      <Checkbox
                        id={prereq.id}
                        checked={formData.prerequisite_ids.includes(prereq.id)}
                        onCheckedChange={() => togglePrerequisite(prereq.id)}
                      />
                      <div className="grid gap-1 leading-none">
                        <label
                          htmlFor={prereq.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {prereq.summary}
                        </label>
                        {prereq.category?.display_name && (
                          <Badge variant="outline" className="w-fit text-xs">
                            {prereq.category.display_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-sm text-muted-foreground">
                {formData.prerequisite_ids.length} prerequisites selected
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating || !formData.name.trim()}>
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Prerequisite Dialog */}
      <Dialog open={customPrereqDialogOpen} onOpenChange={setCustomPrereqDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add Prerequisite</DialogTitle>
            <DialogDescription>
              Create a new prerequisite and add it to this template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prereq-category">Category *</Label>
              <Select
                value={newPrereqData.category_id}
                onValueChange={(value) => setNewPrereqData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prereq-summary">Summary *</Label>
              <Input
                id="prereq-summary"
                value={newPrereqData.summary}
                onChange={(e) => setNewPrereqData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief description of the prerequisite"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prereq-description">Description (Optional)</Label>
              <Textarea
                id="prereq-description"
                value={newPrereqData.description}
                onChange={(e) => setNewPrereqData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCustomPrereqDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAndAddPrereq}
              disabled={isCreatingPrereq || !newPrereqData.category_id || !newPrereqData.summary.trim()}
            >
              {isCreatingPrereq ? 'Creating...' : 'Create & Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PACTemplatesList;
