import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2, Search, Settings2 } from 'lucide-react';
import { usePACPrerequisites, usePACCategories, PACPrerequisite } from '@/hooks/useHandoverPrerequisites';
import { Skeleton } from '@/components/ui/skeleton';
import PACPrerequisiteDialog from './PACPrerequisiteDialog';
import { cn } from '@/lib/utils';

// Category color configuration for visual distinction
const categoryColors = [
  { 
    border: 'border-l-4 border-l-sky-300 dark:border-l-sky-600',
    bg: 'bg-sky-50/40 dark:bg-sky-950/20',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
  },
  { 
    border: 'border-l-4 border-l-emerald-300 dark:border-l-emerald-600',
    bg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
  },
  { 
    border: 'border-l-4 border-l-violet-300 dark:border-l-violet-600',
    bg: 'bg-violet-50/40 dark:bg-violet-950/20',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
  },
  { 
    border: 'border-l-4 border-l-amber-300 dark:border-l-amber-600',
    bg: 'bg-amber-50/40 dark:bg-amber-950/20',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
  },
];

interface ColumnVisibility {
  sampleEvidence: boolean;
  deliveringParty: boolean;
  receivingParty: boolean;
}

const PACPrerequisitesList: React.FC = () => {
  const { data: prerequisites, isLoading: isLoadingPrereqs, deletePrerequisite, isDeleting } = usePACPrerequisites();
  const { data: categories, isLoading: isLoadingCategories } = usePACCategories();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrerequisite, setEditingPrerequisite] = useState<PACPrerequisite | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    sampleEvidence: false,
    deliveringParty: false,
    receivingParty: false,
  });

  // Group prerequisites by category
  const groupedPrerequisites = useMemo(() => {
    if (!prerequisites || !categories) return {};
    
    const grouped: Record<string, PACPrerequisite[]> = {};
    categories.forEach(cat => {
      grouped[cat.id] = prerequisites
        .filter(p => p.category_id === cat.id)
        .filter(p => 
          !searchQuery || 
          p.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => a.display_order - b.display_order);
    });
    return grouped;
  }, [prerequisites, categories, searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleEdit = (prerequisite: PACPrerequisite) => {
    setEditingPrerequisite(prerequisite);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingPrerequisite(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this prerequisite?')) {
      deletePrerequisite(id);
    }
  };

  if (isLoadingPrereqs || isLoadingCategories) {
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
            <div>
              <CardTitle>Prerequisites</CardTitle>
              <CardDescription>
                Manage prerequisites for Provisional Handover organized by category
              </CardDescription>
            </div>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Prerequisite
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prerequisites..."
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
              <DropdownMenuContent align="end">
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
        </CardContent>
      </Card>

      {/* Categories with Prerequisites */}
      <div className="space-y-4">
        {categories?.map((category, index) => {
          const categoryPrereqs = groupedPrerequisites[category.id] || [];
          const isOpen = openCategories[category.id] ?? false;
          const colorScheme = categoryColors[index % categoryColors.length];

          return (
            <Collapsible
              key={category.id}
              open={isOpen}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <Card className={cn(colorScheme.border, colorScheme.bg)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-lg">{category.display_name}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
                        colorScheme.badge
                      )}>
                        <span className="font-semibold">{categoryPrereqs.length}</span>
                        <span className="text-xs opacity-70">items</span>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {categoryPrereqs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No prerequisites in this category
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
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
                          {categoryPrereqs.map((prereq, index) => (
                            <TableRow
                              key={prereq.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleEdit(prereq)}
                            >
                              <TableCell className="font-mono text-muted-foreground">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{prereq.summary}</p>
                                  {prereq.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {prereq.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              {columnVisibility.sampleEvidence && (
                                <TableCell className="text-sm text-muted-foreground min-w-48 max-w-72">
                                  <p className="whitespace-normal break-words">{prereq.sample_evidence || '-'}</p>
                                </TableCell>
                              )}
                              {columnVisibility.deliveringParty && (
                                <TableCell>
                                  {prereq.delivering_parties && prereq.delivering_parties.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {prereq.delivering_parties.map((role, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {role.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : prereq.delivering_role?.name ? (
                                    <Badge variant="outline">{prereq.delivering_role.name}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              )}
                              {columnVisibility.receivingParty && (
                                <TableCell>
                                  {prereq.receiving_parties && prereq.receiving_parties.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {prereq.receiving_parties.map((role, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {role.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : prereq.receiving_role?.name ? (
                                    <Badge variant="outline">{prereq.receiving_role.name}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(prereq)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(prereq.id)}
                                    disabled={isDeleting}
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
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Dialog */}
      <PACPrerequisiteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prerequisite={editingPrerequisite}
        categories={categories || []}
      />
    </div>
  );
};

export default PACPrerequisitesList;
