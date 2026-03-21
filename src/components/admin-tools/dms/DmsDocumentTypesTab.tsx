import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Loader2, SlidersHorizontal, X, ChevronsUpDown, Check } from 'lucide-react';
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

interface SecondaryDiscipline {
  id: string;
  document_type_id: string;
  discipline_code: string;
  discipline_name: string | null;
}

// Check if a discipline code is a vendor/non-standard code (ZV or 3-char alphanumeric)
const isVendorDiscipline = (code: string | null): boolean => {
  if (!code) return false;
  return code === 'ZV' || /^[A-Z0-9]{3,}$/.test(code);
};

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
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-9 font-normal text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <div className="flex flex-col gap-0.5 py-0.5">
                {selected.slice(0, 5).map(s => {
                  const opt = options.find(o => o.value === s);
                  return (
                    <Badge key={s} variant="secondary" className="text-xs px-1.5 py-0.5 w-fit">
                      <span className="font-mono mr-1">{s}</span>
                      {opt?.sublabel && <span className="text-muted-foreground font-normal">{opt.sublabel}</span>}
                    </Badge>
                  );
                })}
                {selected.length > 5 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    +{selected.length - 5} more
                  </Badge>
                )}
              </div>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-0 z-[200]" align="start">
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

type FilterKey = 'tier1' | 'tier2' | 'rlmu' | 'elect' | 'static' | 'rotating' | 'inst' | 'ops' | 'tech_safety' | 'vendor';

type FilterCategory = 'tier' | 'discipline' | 'vendor' | 'other';

interface FilterChip {
  key: FilterKey;
  label: string;
  category: FilterCategory;
  activeClass: string;
  countBadgeClass: string;
  dotColor: string;
  hoverClass: string;
  disciplineName?: string;
  match: (d: DocTypeRow, secondaryMap?: Map<string, SecondaryDiscipline[]>) => boolean;
}

const FILTER_CHIPS: FilterChip[] = [
  // Tier category
  { key: 'tier1', label: 'Tier 1', category: 'tier', activeClass: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700', countBadgeClass: 'bg-orange-200/80 text-orange-800 border-orange-300/60 dark:bg-orange-800/40 dark:text-orange-300 dark:border-orange-700/50', dotColor: 'bg-orange-500', hoverClass: 'hover:border-orange-300 dark:hover:border-orange-700', match: d => d.tier === 'Tier 1' },
  { key: 'tier2', label: 'Tier 2', category: 'tier', activeClass: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700', countBadgeClass: 'bg-blue-200/80 text-blue-800 border-blue-300/60 dark:bg-blue-800/40 dark:text-blue-300 dark:border-blue-700/50', dotColor: 'bg-blue-500', hoverClass: 'hover:border-blue-300 dark:hover:border-blue-700', match: d => d.tier === 'Tier 2' },
  // Other
  { key: 'rlmu', label: 'RLMU', category: 'other', activeClass: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700', countBadgeClass: 'bg-amber-200/60 text-amber-800 dark:bg-amber-800/40 dark:text-amber-300', dotColor: 'bg-amber-600', hoverClass: 'hover:border-amber-300 dark:hover:border-amber-700', match: d => d.rlmu === 'RLMU' },
  // Discipline category
  { key: 'elect', label: 'Elect', category: 'discipline', disciplineName: 'Electrical', activeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700', countBadgeClass: 'bg-yellow-200/60 text-yellow-800 dark:bg-yellow-800/40 dark:text-yellow-300', dotColor: 'bg-yellow-500', hoverClass: 'hover:border-yellow-300 dark:hover:border-yellow-700', match: (d, sm) => d.discipline_name === 'Electrical' || (sm?.get(d.id)?.some(s => s.discipline_code === 'EA') ?? false) },
  { key: 'static', label: 'Static', category: 'discipline', disciplineName: 'Mechanical - Static', activeClass: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-700', countBadgeClass: 'bg-teal-200/60 text-teal-800 dark:bg-teal-800/40 dark:text-teal-300', dotColor: 'bg-teal-500', hoverClass: 'hover:border-teal-300 dark:hover:border-teal-700', match: (d, sm) => d.discipline_name === 'Mechanical - Static' || (sm?.get(d.id)?.some(s => s.discipline_code === 'MS') ?? false) },
  { key: 'rotating', label: 'Rotating', category: 'discipline', disciplineName: 'Rotating Equipment', activeClass: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-700', countBadgeClass: 'bg-cyan-200/60 text-cyan-800 dark:bg-cyan-800/40 dark:text-cyan-300', dotColor: 'bg-cyan-500', hoverClass: 'hover:border-cyan-300 dark:hover:border-cyan-700', match: (d, sm) => d.discipline_name === 'Rotating Equipment' || (sm?.get(d.id)?.some(s => s.discipline_code === 'MR') ?? false) },
  { key: 'inst', label: 'Inst', category: 'discipline', disciplineName: 'Instrumentation', activeClass: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700', countBadgeClass: 'bg-purple-200/60 text-purple-800 dark:bg-purple-800/40 dark:text-purple-300', dotColor: 'bg-purple-500', hoverClass: 'hover:border-purple-300 dark:hover:border-purple-700', match: (d, sm) => d.discipline_name === 'Instrumentation' || (sm?.get(d.id)?.some(s => s.discipline_code === 'IN') ?? false) },
  { key: 'ops', label: 'Ops', category: 'discipline', disciplineName: 'Operations', activeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700', countBadgeClass: 'bg-emerald-200/60 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-300', dotColor: 'bg-emerald-500', hoverClass: 'hover:border-emerald-300 dark:hover:border-emerald-700', match: (d, sm) => d.discipline_name === 'Operations' || (sm?.get(d.id)?.some(s => s.discipline_code === 'OA') ?? false) },
  { key: 'tech_safety', label: 'Tech Safety', category: 'discipline', disciplineName: 'HSE&S General', activeClass: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700', countBadgeClass: 'bg-rose-200/60 text-rose-800 dark:bg-rose-800/40 dark:text-rose-300', dotColor: 'bg-rose-500', hoverClass: 'hover:border-rose-300 dark:hover:border-rose-700', match: (d, sm) => d.discipline_name === 'HSE&S General' || (sm?.get(d.id)?.some(s => s.discipline_code === 'HX') ?? false) },
  // Vendor category
  { key: 'vendor', label: 'Vendor', category: 'vendor', disciplineName: 'Vendor', activeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-700', countBadgeClass: 'bg-slate-200/60 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300', dotColor: 'bg-slate-500', hoverClass: 'hover:border-slate-300 dark:hover:border-slate-700', match: (d) => d.discipline_code === 'ZV' || isVendorDiscipline(d.discipline_code) },
];

// Category display order for rendering with separators
const CATEGORY_ORDER: FilterCategory[] = ['tier', 'other', 'discipline', 'vendor'];

const DmsDocumentTypesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DocTypeRow | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDocName, setFormDocName] = useState('');
  const [formDocDesc, setFormDocDesc] = useState('');
  const [formTier, setFormTier] = useState('');
  const [formRlmu, setFormRlmu] = useState('');
  const [formDisciplines, setFormDisciplines] = useState<string[]>([]);
  const [formSecondaryDisciplines, setFormSecondaryDisciplines] = useState<string[]>([]);
  const [formAccStatuses, setFormAccStatuses] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);

  const toggleSort = (col: string) => {
    if (sortCol === col) { if (sortDir === 'asc') setSortDir('desc'); else { setSortCol(null); setSortDir('asc'); } }
    else { setSortCol(col); setSortDir('asc'); }
  };
  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };

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

  const { data: secondaryDisciplines = [] } = useQuery({
    queryKey: ['dms-secondary-disciplines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_document_type_secondary_disciplines')
        .select('*');
      if (error) throw error;
      return data as SecondaryDiscipline[];
    },
  });

  const secondaryMap = React.useMemo(() => {
    const map = new Map<string, SecondaryDiscipline[]>();
    secondaryDisciplines.forEach(sd => {
      const existing = map.get(sd.document_type_id) || [];
      existing.push(sd);
      map.set(sd.document_type_id, existing);
    });
    return map;
  }, [secondaryDisciplines]);

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
      setSheetOpen(false);
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
      setSheetOpen(false);
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

  const chipFiltered = activeFilters.size === 0
    ? filtered
    : filtered.filter(d => {
        return Array.from(activeFilters).some(key => {
          const chip = FILTER_CHIPS.find(c => c.key === key);
          return chip ? chip.match(d, secondaryMap) : false;
        });
      });

  const isDisciplineVisible = columns.some(
    c => (c.id === 'discipline_code' || c.id === 'discipline_name') && c.visible
  );

  const deduped = isDisciplineVisible
    ? chipFiltered
    : chipFiltered.filter((item, index, arr) =>
        arr.findIndex(d => d.code === item.code && d.document_name === item.document_name) === index
      );

  // Apply sorting
  const displayRows = useMemo(() => {
    if (!sortCol) return deduped;
    return [...deduped].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'is_active') {
        cmp = (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1);
      } else {
        const aVal = (a as any)[sortCol] || '';
        const bVal = (b as any)[sortCol] || '';
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [deduped, sortCol, sortDir]);

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

  const openAddSheet = () => {
    setEditingItem(null);
    setFormCode(''); setFormDocName(''); setFormDocDesc(''); setFormTier('');
    setFormRlmu(''); setFormDisciplines([]); setFormSecondaryDisciplines([]); setFormAccStatuses([]);
    setFormIsActive(true);
    setSheetOpen(true);
  };

  const openEditSheet = (item: DocTypeRow) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormDocName(item.document_name);
    setFormDocDesc(item.document_description || '');
    setFormTier(item.tier || '');
    setFormRlmu(item.rlmu || '');
    setFormDisciplines(item.discipline_code ? [item.discipline_code] : []);
    const sds = secondaryMap.get(item.id) || [];
    setFormSecondaryDisciplines(sds.map(s => s.discipline_code));
    setFormAccStatuses(
      item.acceptable_status
        ? item.acceptable_status.split(',').map(s => s.trim()).filter(Boolean)
        : []
    );
    setFormIsActive(item.is_active);
    setSheetOpen(true);
  };

  const saveSecondaryDisciplines = async (docTypeId: string, codes: string[]) => {
    await supabase
      .from('dms_document_type_secondary_disciplines')
      .delete()
      .eq('document_type_id', docTypeId);
    if (codes.length > 0) {
      const rows = codes.map(code => {
        const disc = disciplineOptions.find(d => d.code === code);
        return {
          document_type_id: docTypeId,
          discipline_code: code,
          discipline_name: disc?.name || null,
        };
      });
      await supabase.from('dms_document_type_secondary_disciplines').insert(rows);
    }
  };

  const handleSave = async () => {
    if (!formCode.trim() || !formDocName.trim()) {
      toast.error('Code and Document Name are required');
      return;
    }

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

    try {
      if (editingItem) {
        await updateDocType.mutateAsync({ id: editingItem.id, ...payload });
        if (isVendorDiscipline(payload.discipline_code)) {
          await saveSecondaryDisciplines(editingItem.id, formSecondaryDisciplines);
        }
      } else {
        const maxOrder = docTypes.length > 0 ? Math.max(...docTypes.map(d => d.display_order)) : 0;
        const { data: newDoc, error } = await supabase
          .from('dms_document_types')
          .insert({ ...payload, display_order: maxOrder + 1 })
          .select('id')
          .single();
        if (error) throw error;
        if (newDoc && isVendorDiscipline(payload.discipline_code)) {
          await saveSecondaryDisciplines(newDoc.id, formSecondaryDisciplines);
        }
        queryClient.invalidateQueries({ queryKey: ['dms-document-types'] });
        toast.success('Document type created');
        setSheetOpen(false);
      }
      queryClient.invalidateQueries({ queryKey: ['dms-secondary-disciplines'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
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
      case 'document_name': {
        const sds = secondaryMap.get(item.id);
        const hasSecondary = isVendorDiscipline(item.discipline_code) && sds && sds.length > 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">{item.document_name}</span>
            {hasSecondary && (
              <div className="flex items-center gap-0.5">
                {sds.slice(0, 3).map(sd => (
                  <Badge key={sd.discipline_code} variant="outline" className="text-[10px] px-1 py-0 font-mono text-muted-foreground border-border">
                    {sd.discipline_code}
                  </Badge>
                ))}
                {sds.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{sds.length - 3}</span>
                )}
              </div>
            )}
          </div>
        );
      }
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
            <Button size="sm" className="gap-1.5" onClick={openAddSheet}>
              <Plus className="h-4 w-4" /> Add Document
            </Button>
          </div>
        </CardHeader>
        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1 px-6 pb-3">
          {FILTER_CHIPS.map((chip) => {
            const isActive = activeFilters.has(chip.key);
            const matchCount = isActive ? docTypes.filter(d => chip.match(d, secondaryMap)).length : 0;

            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => toggleFilter(chip.key)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all duration-150 flex items-center gap-0.5",
                  isActive
                    ? `${chip.activeClass} shadow-sm`
                    : `bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground ${chip.hoverClass}`
                )}
              >
                <span className={cn(
                  "rounded-full shrink-0 h-1 w-1",
                  chip.dotColor,
                  isActive && "opacity-0 w-0"
                )} />
                {chip.label}
                {isActive && (
                  <span className={cn("ml-1 px-1.5 py-px rounded-full text-[10px] font-semibold leading-none tabular-nums border", chip.countBadgeClass)}>
                    {matchCount}
                  </span>
                )}
              </button>
            );
          })}
          {activeFilters.size > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilters(new Set())}
              className="px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-150 flex items-center gap-0.5"
            >
              <X className="h-2.5 w-2.5" />
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
                    <TableHead
                      key={col.id}
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
                      onClick={() => toggleSort(col.id)}
                    >
                      {col.label}<SortIcon col={col.id} />
                    </TableHead>
                  ))}
                  <TableHead className="w-16 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((item, idx) => (
                  <TableRow key={item.id} className="group border-border/40 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openEditSheet(item)}>
                    <TableCell className="text-muted-foreground text-xs tabular-nums">{idx + 1}</TableCell>
                    {visibleColumns.map(col => (
                      <TableCell key={col.id}>{getCellValue(item, col.id)}</TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); deleteDocType.mutate(item.id); }}>
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

      {/* ─── Add / Edit Document Type Side Sheet ─── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-xl z-[150] flex flex-col">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg font-semibold">{editingItem ? 'Edit Document Type' : 'Add Document Type'}</SheetTitle>
            <SheetDescription>
              {editingItem ? 'Modify the document type configuration below.' : 'Fill in the details to create a new document type.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-4 flex-1 overflow-y-auto pr-1">
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
                  <SelectContent className="z-[200]">
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
                  <SelectContent className="z-[200]">
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

            {/* Row 4b: Secondary Discipline Classification */}
            {isVendorDiscipline(formDisciplines[0] || null) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Secondary Discipline Classification</Label>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                    Vendor
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tag this vendor document with applicable engineering disciplines for accurate filtering
                </p>
                <MultiSelectDropdown
                  label=""
                  options={disciplineOptions
                    .filter(d => !isVendorDiscipline(d.code))
                    .map(d => ({ value: d.code, label: d.code, sublabel: d.name }))}
                  selected={formSecondaryDisciplines}
                  onChange={setFormSecondaryDisciplines}
                  placeholder="Select applicable disciplines..."
                />
              </div>
            )}

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

          <SheetFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Create Document Type'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DmsDocumentTypesTab;
