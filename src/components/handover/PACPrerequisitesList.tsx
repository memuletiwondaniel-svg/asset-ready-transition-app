import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2, Search, GripVertical } from 'lucide-react';
import { usePACPrerequisites, usePACCategories, PACPrerequisite } from '@/hooks/useHandoverPrerequisites';
import { Skeleton } from '@/components/ui/skeleton';
import PACPrerequisiteDialog from './PACPrerequisiteDialog';

const PACPrerequisitesList: React.FC = () => {
  const { data: prerequisites, isLoading: isLoadingPrereqs, deletePrerequisite, isDeleting } = usePACPrerequisites();
  const { data: categories, isLoading: isLoadingCategories } = usePACCategories();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrerequisite, setEditingPrerequisite] = useState<PACPrerequisite | null>(null);

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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prerequisites..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories with Prerequisites */}
      <div className="space-y-4">
        {categories?.map(category => {
          const categoryPrereqs = groupedPrerequisites[category.id] || [];
          const isOpen = openCategories[category.id] ?? true;

          return (
            <Collapsible
              key={category.id}
              open={isOpen}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
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
                      <Badge variant="secondary" className="text-sm">
                        {categoryPrereqs.length} items
                      </Badge>
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
                            <TableHead>Sample Evidence</TableHead>
                            <TableHead>Delivering Party</TableHead>
                            <TableHead>Receiving Party</TableHead>
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
                              <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                                {prereq.sample_evidence || '-'}
                              </TableCell>
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
