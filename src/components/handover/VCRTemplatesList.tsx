import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Edit2, Trash2, Search, Settings2, FileCheck } from 'lucide-react';
import { useVCRTemplates, VCRTemplate } from '@/hooks/useVCRTemplates';
import { usePACCategories } from '@/hooks/useHandoverPrerequisites';
import { Skeleton } from '@/components/ui/skeleton';
import VCRTemplateDialog from './VCRTemplateDialog';

interface ColumnVisibility {
  sampleEvidence: boolean;
  deliveringParty: boolean;
  receivingParty: boolean;
}

const VCRTemplatesList: React.FC = () => {
  const { data: templates, isLoading: isLoadingTemplates, deleteTemplate, isDeleting } = useVCRTemplates();
  const { data: categories, isLoading: isLoadingCategories } = usePACCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<VCRTemplate | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    sampleEvidence: true,
    deliveringParty: true,
    receivingParty: true,
  });

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

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this VCR template?')) {
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
                  Configure baseline VCR (Verification of Completion Readiness) items. These templates are used when creating project-specific VCRs.
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
                Add VCR Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search VCR templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.sampleEvidence}
                  onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, sampleEvidence: checked }))}
                >
                  Sample Evidence
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.deliveringParty}
                  onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, deliveringParty: checked }))}
                >
                  Delivering Party
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.receivingParty}
                  onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, receivingParty: checked }))}
                >
                  Receiving Party
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Flat Table */}
          <div className="border rounded-lg max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Summary</TableHead>
                  {columnVisibility.sampleEvidence && <TableHead className="min-w-48">Sample Evidence</TableHead>}
                  {columnVisibility.deliveringParty && <TableHead>Delivering Party</TableHead>}
                  {columnVisibility.receivingParty && <TableHead>Receiving Party</TableHead>}
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3 + (columnVisibility.sampleEvidence ? 1 : 0) + (columnVisibility.deliveringParty ? 1 : 0) + (columnVisibility.receivingParty ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                      {templates?.length === 0 ? 'No VCR templates yet. Click "Add VCR Template" to create one.' : 'No templates match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template, index) => (
                    <TableRow
                      key={template.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEdit(template)}
                    >
                      <TableCell className="font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.summary}</p>
                          {template.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      {columnVisibility.sampleEvidence && (
                        <TableCell className="text-sm text-muted-foreground min-w-48 max-w-72">
                          <p className="whitespace-normal break-words">{template.sample_evidence || '-'}</p>
                        </TableCell>
                      )}
                      {columnVisibility.deliveringParty && (
                        <TableCell>
                          {template.delivering_role?.name ? (
                            <Badge variant="outline">{template.delivering_role.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.receivingParty && (
                        <TableCell>
                          {template.receiving_role?.name ? (
                            <Badge variant="outline">{template.receiving_role.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(template.id)}
                            disabled={isDeleting}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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

export default VCRTemplatesList;
