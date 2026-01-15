import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Edit2, Trash2, Search, List, Settings2 } from 'lucide-react';
import { useFACPrerequisites, FACPrerequisite } from '@/hooks/useHandoverPrerequisites';
import { Skeleton } from '@/components/ui/skeleton';
import FACPrerequisiteDialog from './FACPrerequisiteDialog';
import { cn } from '@/lib/utils';
interface ColumnVisibility {
  sampleEvidence: boolean;
  deliveringParty: boolean;
  receivingParty: boolean;
}
const FACPrerequisitesList: React.FC = () => {
  const {
    data: prerequisites,
    isLoading,
    deletePrerequisite,
    isDeleting
  } = useFACPrerequisites();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrerequisite, setEditingPrerequisite] = useState<FACPrerequisite | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    sampleEvidence: false,
    deliveringParty: false,
    receivingParty: false
  });
  const filteredPrerequisites = prerequisites?.filter(p => p.summary.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => a.display_order - b.display_order) || [];
  const handleEdit = (prerequisite: FACPrerequisite) => {
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
  if (isLoading) {
    return <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>;
  }
  return <div className="space-y-6">
      <Card className="border-l-4 border-l-rose-300 dark:border-l-rose-600 bg-rose-50/30 dark:bg-rose-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                
                <CardDescription>
                  Manage prerequisites for Final Handover acceptance
                </CardDescription>
              </div>
              <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium", "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300")}>
                <span className="font-semibold">{filteredPrerequisites.length}</span>
                <span className="text-xs opacity-70">items</span>
              </div>
            </div>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Prerequisite
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search prerequisites..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem checked={columnVisibility.sampleEvidence} onCheckedChange={checked => setColumnVisibility(prev => ({
                ...prev,
                sampleEvidence: checked
              }))}>
                  Sample Evidence
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.deliveringParty} onCheckedChange={checked => setColumnVisibility(prev => ({
                ...prev,
                deliveringParty: checked
              }))}>
                  Delivering Party
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.receivingParty} onCheckedChange={checked => setColumnVisibility(prev => ({
                ...prev,
                receivingParty: checked
              }))}>
                  Receiving Party
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {filteredPrerequisites.length === 0 ? <div className="text-center py-12 text-muted-foreground">
              <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No FAC prerequisites found</p>
              <p className="text-sm">Add a prerequisite to get started</p>
            </div> : <Table>
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
                {filteredPrerequisites.map((prereq, index) => <TableRow key={prereq.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(prereq)}>
                    <TableCell className="font-mono text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{prereq.summary}</p>
                        {prereq.description && <p className="text-sm text-muted-foreground line-clamp-1">
                            {prereq.description}
                          </p>}
                      </div>
                    </TableCell>
                    {columnVisibility.sampleEvidence && <TableCell className="text-sm text-muted-foreground min-w-48 max-w-72">
                        <p className="whitespace-normal break-words">{prereq.sample_evidence || '-'}</p>
                      </TableCell>}
                    {columnVisibility.deliveringParty && <TableCell>
                        {prereq.delivering_role?.name ? <Badge variant="outline">{prereq.delivering_role.name}</Badge> : <span className="text-muted-foreground">-</span>}
                      </TableCell>}
                    {columnVisibility.receivingParty && <TableCell>
                        {prereq.receiving_role?.name ? <Badge variant="outline">{prereq.receiving_role.name}</Badge> : <span className="text-muted-foreground">-</span>}
                      </TableCell>}
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(prereq)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(prereq.id)} disabled={isDeleting} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>

      <FACPrerequisiteDialog open={dialogOpen} onOpenChange={setDialogOpen} prerequisite={editingPrerequisite} />
    </div>;
};
export default FACPrerequisitesList;