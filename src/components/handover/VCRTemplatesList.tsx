import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Search, FileCheck, CheckSquare, Users } from 'lucide-react';
import { useVCRTemplates, VCRTemplate } from '@/hooks/useVCRTemplates';
import { usePACCategories } from '@/hooks/useHandoverPrerequisites';
import { Skeleton } from '@/components/ui/skeleton';
import VCRTemplateDialog from './VCRTemplateDialog';

const VCRTemplatesList: React.FC = () => {
  const { data: templates, isLoading: isLoadingTemplates, deleteTemplate, isDeleting } = useVCRTemplates();
  const { data: categories, isLoading: isLoadingCategories } = usePACCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<VCRTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates
      .filter(t =>
        !searchQuery ||
        t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.display_order - b.display_order);
  }, [templates, searchQuery]);

  const handleEdit = (template: VCRTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
    }
  };

  const totalCount = templates?.length || 0;

  if (isLoadingTemplates || isLoadingCategories) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>VCR Templates</CardTitle>
                <CardDescription>
                  Configure baseline VCR templates with selected items and approvers.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                <span className="font-semibold">{totalCount}</span>
                <span className="text-xs opacity-70">templates</span>
              </div>
              <Button onClick={handleAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Template Cards Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {templates?.length === 0
                ? 'No templates yet. Click "Add Template" to create one.'
                : 'No templates match your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleEdit(template)}
                  onDelete={(e) => handleDelete(e, template.id)}
                  isDeleting={isDeleting}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <VCRTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editingTemplate}
        categories={categories || []}
      />
    </div>
  );
};

interface TemplateCardProps {
  template: VCRTemplate;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onEdit, onDelete, isDeleting }) => {
  const itemCount = template.template_items?.length || 0;
  const approverCount = template.template_approvers?.length || 0;

  return (
    <div
      onClick={onEdit}
      className="group relative rounded-xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden"
    >
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />

      <div className="p-4 space-y-3">
        {/* Title & Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{template.summary}</h3>
            {template.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-[10px] px-2 py-0.5">
            <CheckSquare className="h-3 w-3" />
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px] px-2 py-0.5">
            <Users className="h-3 w-3" />
            {approverCount} {approverCount === 1 ? 'approver' : 'approvers'}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default VCRTemplatesList;
