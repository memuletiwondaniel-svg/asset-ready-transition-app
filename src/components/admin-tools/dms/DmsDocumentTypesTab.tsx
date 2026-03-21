import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Pencil, Trash2, Loader2, SlidersHorizontal, X, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface DocTypeRow {
  id: string;
  code: string;
  document_name: string;
  document_description: string | null;
  tier: string | null;
  rlmu: string | null;
  discipline_code: string | null;
  discipline_name: string | null;
  acceptable_status: string | null;
  is_active: boolean;
  display_order: number;
}

interface DisciplineOption {
  id: string;
  code: string;
  name: string;
}

interface StatusCodeOption {
  id: string;
  code: string;
  description: string;
}

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  toggleable: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'code', label: 'Code', visible: true, toggleable: false },
  { id: 'document_name', label: 'Document Name', visible: true, toggleable: false },
  { id: 'document_description', label: 'Document Description', visible: false, toggleable: true },
  { id: 'tier', label: 'Tier', visible: true, toggleable: true },
  { id: 'rlmu', label: 'RLMU', visible: false, toggleable: true },
  { id: 'discipline_code', label: 'Discipline Code', visible: false, toggleable: true },
  { id: 'discipline_name', label: 'Discipline Name', visible: false, toggleable: true },
  { id: 'acceptable_status', label: 'Acceptable Status', visible: false, toggleable: true },
];

const TIER_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Tier 1', label: 'Tier 1' },
  { value: 'Tier 2', label: 'Tier 2' },
];

const RLMU_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'RLMU', label: 'Yes' },
];

// Multi-select dropdown component
const MultiSelectDropdown: React.FC<{
  label: string;
  options: { value: string; label: string; sublabel?: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
}> = ({ label, options, selected, onChange, placeholder = 'Select...', searchable = true }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.value.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val]);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-9 font-normal text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1 py-0.5">
                {selected.slice(0, 3).map(s => (
                  <Badge key={s} variant="secondary" className="text-xs font-mono px-1.5 py-0">
                    {s}
                  </Badge>
                ))}
                {selected.length > 3 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    +{selected.length - 3} more
                  </Badge>
                )}
              </div>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-0" align="start">
          {searchable && (
            <div className="p-2 border-b">
              <Input
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}
          <ScrollArea className="h-[220px]">
            <div className="p-1">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
              )}
              {filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left text-sm rounded hover:bg-accent transition-colors"
                  onClick={() => toggle(opt.value)}
                >
                  <div className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                    selected.includes(opt.value) ? "bg-primary border-primary" : "border-input"
                  )}>
                    {selected.includes(opt.value) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground w-8 shrink-0">{opt.value}</span>
                  <span className="truncate">{opt.sublabel || opt.label}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
          {selected.length > 0 && (
            <div className="border-t p-2 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{selected.length} selected</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onChange([])}>
                Clear all
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

type FilterKey = 'tier1' | 'tier2' | 'elect' | 'static' | 'rotating' | 'inst' | 'ops' | 'tech_safety' | 'rlmu';

interface FilterChip {
  key: FilterKey;
  label: string;
  group: 'tier' | 'discipline' | 'rlmu';
  activeClass: string;
  dotColor: string;
  hoverClass: string;
  match: (d: DocTypeRow) => boolean;
}

const FILTER_CHIPS: FilterChip[] = [
  { key: 'tier1', label: 'Tier 1', group: 'tier', activeClass: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700', dotColor: 'bg-orange-500', hoverClass: 'hover:border-orange-300 dark:hover:border-orange-700', match: d => d.tier === 'Tier 1' },
  { key: 'tier2', label: 'Tier 2', group: 'tier', activeClass: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700', dotColor: 'bg-blue-500', hoverClass: 'hover:border-blue-300 dark:hover:border-blue-700', match: d => d.tier === 'Tier 2' },
  { key: 'elect', label: 'Elect', group: 'discipline', activeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700', dotColor: 'bg-yellow-500', hoverClass: 'hover:border-yellow-300 dark:hover:border-yellow-700', match: d => d.discipline_name === 'Electrical' },
  { key: 'static', label: 'Static', group: 'discipline', activeClass: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-700', dotColor: 'bg-teal-500', hoverClass: 'hover:border-teal-300 dark:hover:border-teal-700', match: d => d.discipline_name === 'Mechanical - Static' },
  { key: 'rotating', label: 'Rotating', group: 'discipline', activeClass: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-700', dotColor: 'bg-cyan-500', hoverClass: 'hover:border-cyan-300 dark:hover:border-cyan-700', match: d => d.discipline_name === 'Rotating Equipment' },
  { key: 'inst', label: 'Inst', group: 'discipline', activeClass: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700', dotColor: 'bg-purple-500', hoverClass: 'hover:border-purple-300 dark:hover:border-purple-700', match: d => d.discipline_name === 'Instrumentation' },
  { key: 'ops', label: 'Ops', group: 'discipline', activeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700', dotColor: 'bg-emerald-500', hoverClass: 'hover:border-emerald-300 dark:hover:border-emerald-700', match: d => d.discipline_name === 'Operations' },
  { key: 'tech_safety', label: 'Tech Safety', group: 'discipline', activeClass: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700', dotColor: 'bg-rose-500', hoverClass: 'hover:border-rose-300 dark:hover:border-rose-700', match: d => d.discipline_name === 'HSE&S General' },
  { key: 'rlmu', label: 'RLMU', group: 'rlmu', activeClass: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700', dotColor: 'bg-amber-600', hoverClass: 'hover:border-amber-300 dark:hover:border-amber-700', match: d => d.rlmu === 'RLMU' },
];

const DmsDocumentTypesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DocTypeRow | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDocName, setFormDocName] = useState('');
  const [formDocDesc, setFormDocDesc] = useState('');
  const [formTier, setFormTier] = useState('');
  const [formRlmu, setFormRlmu] = useState('');
  const [formDisciplines, setFormDisciplines] = useState<string[]>([]);
  const [formAccStatuses, setFormAccStatuses] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);

  const { data: docTypes = [], isLoading } = useQuery({
    queryKey: ['dms-document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_document_types')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as DocTypeRow[];
    },
  });

  // Fetch disciplines for dropdown
  const { data: disciplineOptions = [] } = useQuery({
    queryKey: ['dms-disciplines-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_disciplines')
        .select('id, code, name')
        .eq('is_active', true)
        .order('code', { ascending: true });
      if (error) throw error;
      return data as DisciplineOption[];
    },
  });

  // Fetch status codes for dropdown
  const { data: statusCodeOptions = [] } = useQuery({
    queryKey: ['dms-status-codes-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_status_codes')
        .select('id, code, description')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as StatusCodeOption[];
    },
  });

  const createDocType = useMutation({
    mutationFn: async (item: Omit<DocTypeRow, 'id' | 'display_order'>) => {
      const maxOrder = docTypes.length > 0 ? Math.max(...docTypes.map(d => d.display_order)) : 0;
      const { error } = await supabase
        .from('dms_document_types')
        .insert({ ...item, display_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms-document-types'] });
      toast.success('Document type created');
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create document type'),
  });

  const updateDocType = useMutation({
    mutationFn: async (item: { id: string } & Partial<DocTypeRow>) => {
      const { id, ...rest } = item;
      const { error } = await supabase
        .from('dms_document_types')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms-document-types'] });
      toast.success('Document type updated');
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update document type'),
  });

  const deleteDocType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dms_document_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-document-types'] }); toast.success('Document type deleted'); },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  const filtered = docTypes.filter(d => {
    const q = searchQuery.toLowerCase();
    return d.code.toLowerCase().includes(q) ||
      d.document_name.toLowerCase().includes(q) ||
      (d.document_description || '').toLowerCase().includes(q) ||
      (d.discipline_code || '').toLowerCase().includes(q) ||
      (d.discipline_name || '').toLowerCase().includes(q);
  });

  // Apply active filter chips
  const chipFiltered = activeFilters.size === 0
    ? filtered
    : filtered.filter(d => {
        return Array.from(activeFilters).some(key => {
          const chip = FILTER_CHIPS.find(c => c.key === key);
          return chip ? chip.match(d) : false;
        });
      });

  const isDisciplineVisible = columns.some(
    c => (c.id === 'discipline_code' || c.id === 'discipline_name') && c.visible
  );

  const displayRows = isDisciplineVisible
    ? chipFiltered
    : chipFiltered.filter((item, index, arr) =>
        arr.findIndex(d => d.code === item.code && d.document_name === item.document_name) === index
      );

  const visibleColumns = columns.filter(c => c.visible);

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleColumn = (colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, visible: !c.visible } : c));
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormCode(''); setFormDocName(''); setFormDocDesc(''); setFormTier('');
    setFormRlmu(''); setFormDisciplines([]); setFormAccStatuses([]);
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (item: DocTypeRow) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormDocName(item.document_name);
    setFormDocDesc(item.document_description || '');
    setFormTier(item.tier || '');
    setFormRlmu(item.rlmu || '');
    // Parse existing discipline
    setFormDisciplines(item.discipline_code ? [item.discipline_code] : []);
    // Parse acceptable statuses (comma-separated)
    setFormAccStatuses(
      item.acceptable_status
        ? item.acceptable_status.split(',').map(s => s.trim()).filter(Boolean)
        : []
    );
    setFormIsActive(item.is_active);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formCode.trim() || !formDocName.trim()) {
      toast.error('Code and Document Name are required');
      return;
    }

    // Find discipline name from selected code
    const selectedDisc = disciplineOptions.find(d => formDisciplines.includes(d.code));

    const payload = {
      code: formCode.trim(),
      document_name: formDocName.trim(),
      document_description: formDocDesc.trim() || null,
      tier: formTier || null,
      rlmu: formRlmu || null,
      discipline_code: formDisciplines.length > 0 ? formDisciplines[0] : null,
      discipline_name: selectedDisc ? selectedDisc.name : null,
      acceptable_status: formAccStatuses.length > 0 ? formAccStatuses.join(', ') : null,
      is_active: formIsActive,
    };

    if (editingItem) {
      updateDocType.mutate({ id: editingItem.id, ...payload });
    } else {
      createDocType.mutate(payload as any);
    }
  };

  const isSaving = createDocType.isPending || updateDocType.isPending;

  const getCellValue = (item: DocTypeRow, colId: string) => {
    switch (colId) {
      case 'code': return (
        <span className="inline-flex items-center justify-center h-6 min-w-[2.5rem] px-1.5 rounded bg-muted text-xs font-mono font-medium text-foreground">
          {item.code}
        </span>
      );
      case 'document_name': return <span className="text-sm text-foreground">{item.document_name}</span>;
      case 'document_description': return <span className="text-sm text-muted-foreground max-w-[300px] truncate block">{item.document_description || '—'}</span>;
      case 'tier': return <span className="text-sm text-muted-foreground">{item.tier || '—'}</span>;
      case 'rlmu': return <span className="text-sm text-muted-foreground">{item.rlmu || '—'}</span>;
      case 'discipline_code': return (
        item.discipline_code ? (
          <span className="inline-flex items-center justify-center h-6 min-w-[2rem] px-1.5 rounded bg-muted text-xs font-mono font-medium text-foreground">
            {item.discipline_code}
          </span>
        ) : <span className="text-sm text-muted-foreground">—</span>
      );
      case 'discipline_name': return <span className="text-sm text-muted-foreground">{item.discipline_name || '—'}</span>;
      case 'acceptable_status': return <span className="text-sm text-muted-foreground">{item.acceptable_status || '—'}</span>;
      default: return null;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-lg">Document Type</CardTitle>
            <CardDescription>Manage document type codes · Showing {displayRows.length} of {docTypes.length} entries</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <SlidersHorizontal className="h-4 w-4" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Toggle Columns</p>
                <div className="space-y-2">
                  {columns.filter(c => c.toggleable).map(col => (
                    <label key={col.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={col.visible} onCheckedChange={() => toggleColumn(col.id)} />
                      {col.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
              <Plus className="h-4 w-4" /> Add Document
            </Button>
          </div>
        </CardHeader>
        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 px-6 pb-3">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={() => toggleFilter(chip.key)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                activeFilters.has(chip.key)
                  ? chip.activeClass
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              )}
            >
              {chip.label}
            </button>
          ))}
          {activeFilters.size > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilters(new Set())}
              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
        <CardContent className="p-0 max-h-[calc(100vh-320px)] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-xs font-medium uppercase tracking-wider text-muted-foreground">#</TableHead>
                  {visibleColumns.map(col => (
                    <TableHead key={col.id} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-24 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((item, idx) => (
                  <TableRow key={item.id} className="group border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="text-muted-foreground text-xs tabular-nums">{idx + 1}</TableCell>
                    {visibleColumns.map(col => (
                      <TableCell key={col.id}>{getCellValue(item, col.id)}</TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteDocType.mutate(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {displayRows.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 2} className="text-center py-8 text-muted-foreground">
                      No document types found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ─── Add / Edit Document Type Modal ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-lg font-semibold">{editingItem ? 'Edit Document Type' : 'Add Document Type'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Modify the document type configuration below.' : 'Fill in the details to create a new document type.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Row 1: Code + Document Name */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Code <span className="text-destructive">*</span></Label>
                <Input value={formCode} onChange={e => setFormCode(e.target.value)} placeholder="e.g. 4018" maxLength={10} className="font-mono" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Document Name <span className="text-destructive">*</span></Label>
                <Input value={formDocName} onChange={e => setFormDocName(e.target.value)} placeholder="e.g. General Arrangement Diagram" />
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Input value={formDocDesc} onChange={e => setFormDocDesc(e.target.value)} placeholder="Optional description of the document type" />
            </div>

            {/* Row 3: Tier + RLMU */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tier</Label>
                <Select value={formTier} onValueChange={setFormTier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value || 'none'}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">RLMU</Label>
                <Select value={formRlmu} onValueChange={setFormRlmu}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select RLMU" />
                  </SelectTrigger>
                  <SelectContent>
                    {RLMU_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value || 'none'}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Discipline (multi-select) */}
            <MultiSelectDropdown
              label="Discipline"
              options={disciplineOptions.map(d => ({ value: d.code, label: d.code, sublabel: d.name }))}
              selected={formDisciplines}
              onChange={setFormDisciplines}
              placeholder="Select disciplines..."
            />

            {/* Row 5: Acceptable Status (multi-select) */}
            <MultiSelectDropdown
              label="Acceptable Status"
              options={statusCodeOptions.map(s => ({ value: s.code, label: s.code, sublabel: s.description }))}
              selected={formAccStatuses}
              onChange={setFormAccStatuses}
              placeholder="Select acceptable statuses..."
            />

            {/* Row 6: Active toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Active Status</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Enable or disable this document type</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Create Document Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DmsDocumentTypesTab;
