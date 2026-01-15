import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, Edit2, FileCheck2, Plus, Star, Trash2 } from 'lucide-react';
import { useCertificateTemplates } from '@/hooks/useHandoverCertificateTemplates';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const SOFCertificateManagement: React.FC = () => {
  const { data: templates, isLoading, updateTemplate, createTemplate, deleteTemplate, setDefault, isUpdating, isCreating } = useCertificateTemplates('SOF');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      setSelectedTemplate(defaultTemplate.id);
      setContent(defaultTemplate.content);
      setTemplateName(defaultTemplate.name);
    }
  }, [templates, selectedTemplate]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setContent(template.content);
      setTemplateName(template.name);
      setIsEditing(false);
      setIsPreview(false);
    }
  };

  const handleSave = () => {
    if (selectedTemplate) {
      updateTemplate({ id: selectedTemplate, content, name: templateName });
      setIsEditing(false);
    }
  };

  const handleCreateNew = () => {
    if (newTemplateName.trim()) {
      createTemplate({
        certificate_type: 'SOF',
        name: newTemplateName,
        content: newTemplateContent || 'Enter your SoF certificate content here...',
        is_default: false,
        is_active: true,
      });
      setShowNewDialog(false);
      setNewTemplateName('');
      setNewTemplateContent('');
    }
  };

  const handleSetDefault = (id: string) => {
    setDefault({ id, type: 'SOF' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
      if (selectedTemplate === id) {
        setSelectedTemplate(null);
      }
    }
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
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            The Statement of Fitness (SoF) certificate is generated during PSSR completion. 
            Edit the template content below to customize the certificate text. Use placeholders 
            like [PROJECT_NAME], [PSSR_NUMBER], [FACILITY_NAME] for dynamic content.
          </p>
        </CardContent>
      </Card>

      {/* Template Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5" />
                SoF Certificate Templates
              </CardTitle>
              <CardDescription>
                Manage and edit Statement of Fitness certificate templates
              </CardDescription>
            </div>
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New SoF Template</DialogTitle>
                  <DialogDescription>
                    Create a new template for SoF certificates (e.g., Process Safety Incident template)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      placeholder="e.g., Process Safety Incident SoF"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Initial Content (Optional)</Label>
                    <Textarea
                      value={newTemplateContent}
                      onChange={e => setNewTemplateContent(e.target.value)}
                      placeholder="Enter initial certificate content..."
                      rows={6}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateNew} disabled={isCreating || !newTemplateName.trim()}>
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {templates?.map(template => (
              <Button
                key={template.id}
                variant={selectedTemplate === template.id ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => handleTemplateSelect(template.id)}
              >
                {template.is_default && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                {template.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor/Preview */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <Input
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    className="text-lg font-semibold h-9 w-64"
                  />
                ) : (
                  <CardTitle>{templateName}</CardTitle>
                )}
                {templates?.find(t => t.id === selectedTemplate)?.is_default && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    Default
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!templates?.find(t => t.id === selectedTemplate)?.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(selectedTemplate)}
                    className="gap-1"
                  >
                    <Star className="h-4 w-4" />
                    Set Default
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(selectedTemplate)}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreview(!isPreview)}
                  className="gap-1"
                >
                  <Eye className="h-4 w-4" />
                  {isPreview ? 'Edit' : 'Preview'}
                </Button>
                {isEditing ? (
                  <Button size="sm" onClick={handleSave} disabled={isUpdating} className="gap-1">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1">
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isPreview ? (
              <div className="bg-muted/50 rounded-lg p-6 border">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {content}
                </pre>
              </div>
            ) : (
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                disabled={!isEditing}
                rows={20}
                className="font-mono text-sm"
                placeholder="Enter SoF certificate content..."
              />
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Use placeholders like [PROJECT_NAME], [FACILITY_NAME], [PSSR_NUMBER] for dynamic content
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SOFCertificateManagement;
