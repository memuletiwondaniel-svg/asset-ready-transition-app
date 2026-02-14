import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Search, FileCheck, CheckSquare, Users, Clock, ShieldCheck, FileEdit } from 'lucide-react';
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
              {filteredTemplates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  colorIndex={index}
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
  colorIndex: number;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  draft: {
    label: 'Draft',
    icon: <FileEdit className="h-3 w-3" />,
    className: 'bg-muted text-muted-foreground border-border/60',
  },
  under_review: {
    label: 'Under Review',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  approved: {
    label: 'Approved',
    icon: <ShieldCheck className="h-3 w-3" />,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
};

const cardGradients = [
  'from-[hsl(210,80%,96%)] via-[hsl(240,70%,95%)] to-[hsl(280,60%,95%)]',
  'from-[hsl(155,60%,95%)] via-[hsl(180,70%,94%)] to-[hsl(210,80%,95%)]',
  'from-[hsl(340,70%,96%)] via-[hsl(0,60%,95%)] to-[hsl(30,80%,95%)]',
  'from-[hsl(45,90%,95%)] via-[hsl(80,60%,94%)] to-[hsl(155,50%,94%)]',
  'from-[hsl(280,50%,95%)] via-[hsl(320,55%,95%)] to-[hsl(350,60%,95%)]',
  'from-[hsl(180,60%,94%)] via-[hsl(200,70%,95%)] to-[hsl(240,60%,96%)]',
  'from-[hsl(20,80%,95%)] via-[hsl(45,70%,94%)] to-[hsl(80,50%,94%)]',
  'from-[hsl(260,60%,96%)] via-[hsl(210,50%,95%)] to-[hsl(180,60%,94%)]',
  'from-[hsl(100,50%,94%)] via-[hsl(140,45%,94%)] to-[hsl(180,55%,95%)]',
  'from-[hsl(350,55%,96%)] via-[hsl(280,45%,95%)] to-[hsl(240,55%,96%)]',
];

const TemplateCard: React.FC<TemplateCardProps> = ({ template, colorIndex, onEdit, onDelete, isDeleting }) => {
  const itemCount = template.template_items?.length || 0;
  const approverCount = template.template_approvers?.length || 0;
  const approvedCount = template.template_approvers?.filter(a => a.approval_status === 'approved').length || 0;
  const status = statusConfig[template.status] || statusConfig.draft;
  const gradient = cardGradients[colorIndex % cardGradients.length];

  return (
    <div
      onClick={onEdit}
      className={`group relative rounded-2xl border border-border/30 bg-gradient-to-br ${gradient} hover:border-border/60 hover:shadow-md transition-all duration-200 cursor-pointer`}
    >
      <div className="p-4 space-y-3">
        {/* Top row: status + actions */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`gap-1 text-[10px] px-2.5 py-0.5 font-medium rounded-full border ${status.className}`}>
            {status.icon}
            {status.label}
            {template.status === 'under_review' && approverCount > 0 && (
              <span className="ml-0.5 opacity-70">({approvedCount}/{approverCount})</span>
            )}
          </Badge>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-accent"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Title & description */}
        <div className="space-y-1">
          <h3 className="font-semibold text-sm leading-snug line-clamp-1">{template.summary}</h3>
          {template.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {template.description}
            </p>
          )}
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2 pt-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-xs text-muted-foreground">
            <CheckSquare className="h-3 w-3" />
            <span className="font-medium text-foreground/80">{itemCount}</span>
            <span className="hidden sm:inline">{itemCount === 1 ? 'item' : 'items'}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span className="font-medium text-foreground/80">{approverCount}</span>
            <span className="hidden sm:inline">{approverCount === 1 ? 'approver' : 'approvers'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VCRTemplatesList;
