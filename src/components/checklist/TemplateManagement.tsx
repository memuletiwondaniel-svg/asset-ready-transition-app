import React, { useState } from 'react';
import { FileText, Plus, Trash2, Download, Upload, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChecklistItem } from '@/hooks/useChecklistItems';
import { z } from 'zod';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
}

interface TemplateManagementProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems?: ChecklistItem[];
}

const templateSchema = z.object({
  name: z.string().trim().min(1, 'Template name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  category: z.string().optional(),
});

export const TemplateManagement: React.FC<TemplateManagementProps> = ({
  isOpen,
  onClose,
  selectedItems = [],
}) => {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
    enabled: isOpen,
  });

  // Create template from selected items
  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      // Validate inputs
      const validated = templateSchema.parse({
        name: templateName,
        description: templateDescription,
        category: templateCategory,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('checklist_templates')
        .insert({
          name: validated.name,
          description: validated.description || null,
          category: validated.category || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Add template items
      const templateItems = selectedItems.map((item, index) => ({
        template_id: template.id,
        unique_id: item.unique_id,
        category: item.category,
        topic: item.topic,
        description: item.description,
        approver: item.Approver,
        responsible: item.responsible,
        display_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('checklist_template_items')
        .insert(templateItems);

      if (itemsError) throw itemsError;

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast.success('Template created successfully');
      setShowCreateDialog(false);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateCategory('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create template');
    },
  });

  // Import template mutation
  const importTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // Fetch template items
      const { data: templateItems, error } = await supabase
        .from('checklist_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('display_order');

      if (error) throw error;

      // Insert new checklist items from template
      const newItems = templateItems.map(item => ({
        unique_id: `${item.unique_id}-${Date.now()}`, // Make unique
        category: item.category,
        topic: item.topic,
        description: item.description,
        approver: item.approver,
        responsible: item.responsible,
        status: 'pending',
      }));

      const { error: insertError } = await supabase
        .from('checklist_items')
        .insert(newItems);

      if (insertError) throw insertError;

      return newItems.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      toast.success(`Successfully imported ${count} item${count !== 1 ? 's' : ''} from template`);
      setShowImportDialog(false);
      setSelectedTemplate(null);
      onClose();
    },
    onError: () => {
      toast.error('Failed to import template');
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('checklist_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  const handleCreateTemplate = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to create a template');
      return;
    }
    setShowCreateDialog(true);
  };

  const handleImportTemplate = () => {
    if (!selectedTemplate) {
      toast.error('Please select a template to import');
      return;
    }
    importTemplateMutation.mutate(selectedTemplate);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto no-hover-effects">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Template Management
            </DialogTitle>
            <DialogDescription className="text-base">
              Create reusable templates from checklist items or import from existing templates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleCreateTemplate}
                disabled={selectedItems.length === 0}
                className="fluent-button shadow-fluent-sm hover:shadow-fluent-md flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create from Selected ({selectedItems.length})
              </Button>
              <Button
                onClick={() => setShowImportDialog(true)}
                variant="outline"
                className="fluent-button flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Template
              </Button>
            </div>

            {/* Templates List */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Saved Templates</h3>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No templates saved yet. Create one from your selected items.
                </div>
              ) : (
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <Card key={template.id} className="fluent-card border-border/40">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            {template.description && (
                              <CardDescription>{template.description}</CardDescription>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTemplate(template.id);
                                setShowImportDialog(true);
                              }}
                              className="h-8 w-8"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {template.category && (
                        <CardContent className="pt-0">
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg no-hover-effects">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-semibold">Create New Template</DialogTitle>
            <DialogDescription className="text-base">
              Create a reusable template from {selectedItems.length} selected item{selectedItems.length !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name" className="text-sm font-semibold">Template Name *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Process Safety Checklist"
                className="h-11 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description" className="text-sm font-semibold">Description</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe this template..."
                rows={3}
                className="bg-background/50 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-category" className="text-sm font-semibold">Category (Optional)</Label>
              <Input
                id="template-category"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                placeholder="e.g., Safety, Operations"
                className="h-11 bg-background/50"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setTemplateName('');
                setTemplateDescription('');
                setTemplateCategory('');
              }}
              className="fluent-button"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createTemplateMutation.mutate()}
              disabled={createTemplateMutation.isPending || !templateName.trim()}
              className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
            >
              {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Template Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md no-hover-effects">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-semibold">Import from Template</DialogTitle>
            <DialogDescription className="text-base">
              Select a template to import its checklist items.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Select Template</Label>
              <Select value={selectedTemplate || ''} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="h-11 bg-background/50">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setSelectedTemplate(null);
              }}
              className="fluent-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportTemplate}
              disabled={importTemplateMutation.isPending || !selectedTemplate}
              className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
            >
              {importTemplateMutation.isPending ? 'Importing...' : 'Import Items'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
