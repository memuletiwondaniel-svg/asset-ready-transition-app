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
import { Plus, Pencil, Trash2, Loader2, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

const DmsDocumentTypesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DocTypeRow | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDocName, setFormDocName] = useState('');
  const [formDocDesc, setFormDocDesc] = useState('');
  const [formTier, setFormTier] = useState('');
  const [formRlmu, setFormRlmu] = useState('');
  const [formDiscCode, setFormDiscCode] = useState('');
  const [formDiscName, setFormDiscName] = useState('');
  const [formAccStatus, setFormAccStatus] = useState('');
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

  const createDocType = useMutation({
    mutationFn: async (item: Omit<DocTypeRow, 'id' | 'display_order'>) => {
      const maxOrder = docTypes.length > 0 ? Math.max(...docTypes.map(d => d.display_order)) : 0;
      const { error } = await supabase
        .from('dms_document_types')
        .insert({ ...item, display_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-document-types'] }); toast.success('Document type created'); },
    onError: (err: any) => toast.error(err.message || 'Failed to create'),
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dms-document-types'] }); toast.success('Document type updated'); },
    onError: (err: any) => toast.error(err.message || 'Failed to update'),
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

  const visibleColumns = columns.filter(c => c.visible);

  const toggleColumn = (colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, visible: !c.visible } : c));
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormCode(''); setFormDocName(''); setFormDocDesc(''); setFormTier('');
    setFormRlmu(''); setFormDiscCode(''); setFormDiscName(''); setFormAccStatus('');
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
    setFormDiscCode(item.discipline_code || '');
    setFormDiscName(item.discipline_name || '');
    setFormAccStatus(item.acceptable_status || '');
    setFormIsActive(item.is_active);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formCode.trim() || !formDocName.trim()) {
      toast.error('Code and Document Name are required');
      return;
    }
    const payload = {
      code: formCode.trim(),
      document_name: formDocName.trim(),
      document_description: formDocDesc.trim() || null,
      tier: formTier.trim() || null,
      rlmu: formRlmu.trim() || null,
      discipline_code: formDiscCode.trim() || null,
      discipline_name: formDiscName.trim() || null,
      acceptable_status: formAccStatus.trim() || null,
      is_active: formIsActive,
    };
    if (editingItem) {
      updateDocType.mutate({ id: editingItem.id, ...payload });
    } else {
      createDocType.mutate(payload as any);
    }
    setDialogOpen(false);
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
            <CardDescription>Manage document type codes used in document classification</CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
                      <Checkbox
                        checked={col.visible}
                        onCheckedChange={() => toggleColumn(col.id)}
                      />
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
        <CardContent className="p-0">
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
                {filtered.map((item, idx) => (
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
                {filtered.length === 0 && !isLoading && (
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Document Type' : 'Add Document Type'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the document type details' : 'Create a new document type entry'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={formCode} onChange={e => setFormCode(e.target.value)} placeholder="e.g. 4018" maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Input value={formTier} onChange={e => setFormTier(e.target.value)} placeholder="e.g. Tier 1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Document Name *</Label>
              <Input value={formDocName} onChange={e => setFormDocName(e.target.value)} placeholder="e.g. General Arrangement Diagram" />
            </div>
            <div className="space-y-2">
              <Label>Document Description</Label>
              <Input value={formDocDesc} onChange={e => setFormDocDesc(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>RLMU</Label>
                <Input value={formRlmu} onChange={e => setFormRlmu(e.target.value)} placeholder="e.g. RLMU" />
              </div>
              <div className="space-y-2">
                <Label>Discipline Code</Label>
                <Input value={formDiscCode} onChange={e => setFormDiscCode(e.target.value.toUpperCase())} placeholder="e.g. AA" maxLength={10} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Discipline Name</Label>
              <Input value={formDiscName} onChange={e => setFormDiscName(e.target.value)} placeholder="e.g. Management & Project Eng" />
            </div>
            <div className="space-y-2">
              <Label>Acceptable Status</Label>
              <Input value={formAccStatus} onChange={e => setFormAccStatus(e.target.value)} placeholder="e.g. IFI, AFU, AFP, AFT" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
              <Label className="text-sm">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DmsDocumentTypesTab;
