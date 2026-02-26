import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, Columns } from 'lucide-react';
import { useORAActivityCatalog, useORPPhases, ORAActivity, ORAActivityInput } from '@/hooks/useORAActivityCatalog';
import { ActivityFormDialog } from './ActivityFormDialog';
import { ActivityDetailSheet } from './ActivityDetailSheet';

type ColumnKey = 'phase' | 'description' | 'parent' | 'high' | 'med' | 'low';

const COLUMN_OPTIONS: { key: ColumnKey; label: string }[] = [
  { key: 'phase', label: 'Phase' },
  { key: 'description', label: 'Description' },
  { key: 'parent', label: 'Parent' },
  { key: 'high', label: 'High' },
  { key: 'med', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

const DEFAULT_COLUMNS: ColumnKey[] = ['phase'];

export const ORAActivityCatalog = () => {
  const [filters, setFilters] = useState({ phase_id: '', search: '' });
  const { activities, isLoading, createActivity, updateActivity, deleteActivity, isCreating, isUpdating } = useORAActivityCatalog({
    phase_id: filters.phase_id || undefined,
    search: filters.search || undefined
  });
  const { phases } = useORPPhases();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ORAActivity | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ORAActivity | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const isColVisible = (key: ColumnKey) => visibleColumns.includes(key);

  const handleOpenForm = (activity?: ORAActivity) => {
    setEditingActivity(activity || null);
    setIsFormOpen(true);
  };

  const handleSave = async (payload: ORAActivityInput) => {
    try {
      if (editingActivity) {
        await updateActivity({ id: editingActivity.id, ...payload });
      } else {
        await createActivity(payload);
      }
      setIsFormOpen(false);
      setEditingActivity(null);
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteActivity(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const getPhaseLabel = (phaseId: string | null) => {
    if (!phaseId) return '-';
    return phases.find(p => p.id === phaseId)?.label || '-';
  };

  const getActivityName = (id: string | null) => {
    if (!id) return '-';
    return activities.find(a => a.id === id)?.activity || '-';
  };

  const getCodeColor = (phaseId: string | null) => {
    if (!phaseId) return 'bg-muted text-muted-foreground border-muted';
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return 'bg-muted text-muted-foreground border-muted';
    const colors: Record<string, string> = {
      IDENTIFY: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
      ASSESS: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      SELECT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      DEFINE: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
      EXECUTE: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
      OPERATE: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
    };
    return colors[phase.code] || 'bg-muted text-muted-foreground border-muted';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading activity catalog...</div></div>;
  }

  return (
    <div className="space-y-4 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-card p-3 rounded-lg border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="pl-8 h-9" />
          </div>
          <Select value={filters.phase_id || 'all'} onValueChange={v => setFilters(f => ({ ...f, phase_id: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-[120px] sm:w-[160px] h-9 shrink-0"><SelectValue placeholder="All Phases" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <Columns className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMN_OPTIONS.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={isColVisible(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button onClick={() => handleOpenForm()} size="sm" className="h-9 shrink-0 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" />Add Activity
        </Button>
      </div>

      {/* Table or empty state */}
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4"><Search className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-semibold mb-1">No activities yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">Click "Add Activity" to start building your ORA activity catalog.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-auto max-h-[calc(100vh-320px)]">
          <Table>
             <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[80px]">Code</TableHead>
                <TableHead>Activity</TableHead>
                {isColVisible('description') && <TableHead className="hidden md:table-cell">Description</TableHead>}
                {isColVisible('phase') && <TableHead className="hidden sm:table-cell">Phase</TableHead>}
                {isColVisible('parent') && <TableHead className="hidden md:table-cell">Parent</TableHead>}
                {isColVisible('high') && <TableHead className="hidden sm:table-cell text-center">High</TableHead>}
                {isColVisible('med') && <TableHead className="hidden sm:table-cell text-center">Med</TableHead>}
                {isColVisible('low') && <TableHead className="hidden sm:table-cell text-center">Low</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map(a => (
                <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedActivity(a)}>
                  <TableCell><Badge variant="outline" className={`font-mono text-xs whitespace-nowrap ${getCodeColor(a.phase_id)}`}>{a.activity_code}</Badge></TableCell>
                  <TableCell className="font-medium">
                    <div>{a.activity}</div>
                    {!isColVisible('phase') && <div className="text-xs text-muted-foreground sm:hidden">{getPhaseLabel(a.phase_id)}</div>}
                  </TableCell>
                  {isColVisible('description') && <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">{a.description || '-'}</TableCell>}
                  {isColVisible('phase') && <TableCell className="hidden sm:table-cell">{getPhaseLabel(a.phase_id)}</TableCell>}
                  {isColVisible('parent') && <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{getActivityName(a.parent_activity_id)}</TableCell>}
                  {isColVisible('high') && <TableCell className="hidden sm:table-cell text-center">{a.duration_high ?? '-'}</TableCell>}
                  {isColVisible('med') && <TableCell className="hidden sm:table-cell text-center">{a.duration_med ?? '-'}</TableCell>}
                  {isColVisible('low') && <TableCell className="hidden sm:table-cell text-center">{a.duration_low ?? '-'}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Dialog (for new activities only) */}
      <ActivityFormDialog
        open={isFormOpen}
        onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingActivity(null); }}
        editingActivity={editingActivity}
        phases={phases}
        activities={activities}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />

      {/* Detail Side Panel */}
      <ActivityDetailSheet
        activity={selectedActivity}
        open={!!selectedActivity}
        onOpenChange={(open) => { if (!open) setSelectedActivity(null); }}
        phases={phases}
        activities={activities}
        onSave={async (payload) => {
          await updateActivity(payload);
          setSelectedActivity(null);
        }}
        onDelete={(id) => { setSelectedActivity(null); setDeleteConfirmId(id); }}
        isSaving={isUpdating}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
