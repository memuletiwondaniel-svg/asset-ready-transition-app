import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, AlertTriangle, Clock, CheckCircle2, XCircle, Download } from 'lucide-react';
import { useOutstandingWorkItems, useOWLStats, useProjectsForOWL, OWLFilters, OWLSource, OWLStatus } from '@/hooks/useOutstandingWorkList';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import OWLItemDialog from './OWLItemDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const OWLManagementTab: React.FC = () => {
  const [filters, setFilters] = useState<OWLFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: items, isLoading } = useOutstandingWorkItems({ ...filters, search: searchQuery });
  const { data: stats } = useOWLStats();
  const { data: projects } = useProjectsForOWL();

  // Fetch roles for filter
  const { data: roles } = useQuery({
    queryKey: ['roles-for-owl-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const getStatusIcon = (status: OWLStatus) => {
    switch (status) {
      case 'OPEN':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'CLOSED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSourceBadge = (source: OWLSource) => {
    const colors: Record<OWLSource, string> = {
      PUNCHLIST: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      PSSR: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      PAC: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
      FAC: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    };
    return <Badge className={colors[source]}>{source}</Badge>;
  };

  const getPriorityBadge = (priority: number | null) => {
    if (!priority) return null;
    const colors: Record<number, string> = {
      1: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      2: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      3: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
    };
    return <Badge className={colors[priority]}>P{priority}</Badge>;
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const hasActiveFilters = Object.keys(filters).some(k => filters[k as keyof OWLFilters]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.open || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.inProgress || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Closed</p>
                <p className="text-2xl font-bold text-green-600">{stats?.closed || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Outstanding Work List (OWL)
              </CardTitle>
              <CardDescription>
                Integrated tracking of outstanding items from Punchlists, PSSR, PAC and FAC reviews
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button onClick={handleAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filters Row */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item number, title, or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.projectId || ''}
              onValueChange={value => setFilters(prev => ({ ...prev, projectId: value || undefined }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Projects</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.source || ''}
              onValueChange={value => setFilters(prev => ({ ...prev, source: value as OWLSource || undefined }))}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sources</SelectItem>
                <SelectItem value="PUNCHLIST">Punchlist</SelectItem>
                <SelectItem value="PSSR">PSSR</SelectItem>
                <SelectItem value="PAC">PAC</SelectItem>
                <SelectItem value="FAC">FAC</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status || ''}
              onValueChange={value => setFilters(prev => ({ ...prev, status: value as OWLStatus || undefined }))}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.priority?.toString() || ''}
              onValueChange={value => setFilters(prev => ({ ...prev, priority: value ? parseInt(value) : undefined }))}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priorities</SelectItem>
                <SelectItem value="1">Priority 1</SelectItem>
                <SelectItem value="2">Priority 2</SelectItem>
                <SelectItem value="3">Priority 3</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <XCircle className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Showing {items?.length || 0} items
          </div>

          {/* Table */}
          {items?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No outstanding work items found</p>
              <p className="text-sm">Add an item or adjust your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Item #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action Party</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map(item => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEdit(item)}
                  >
                    <TableCell className="font-mono text-sm">
                      {item.item_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.project?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {getSourceBadge(item.source)}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(item.priority)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="text-sm">{item.status.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.action_role?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.due_date ? format(new Date(item.due_date), 'dd MMM yyyy') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OWLItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        projects={projects || []}
      />
    </div>
  );
};

export default OWLManagementTab;
