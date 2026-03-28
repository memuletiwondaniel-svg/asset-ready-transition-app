import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Plus, Trash2, Search, Loader2, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AcronymRow {
  id: string;
  acronym: string;
  type_code: string;
  full_name: string;
  notes: string | null;
  is_learned: boolean | null;
  learned_from_user_id: string | null;
  usage_count: number | null;
  created_at: string;
  updated_at: string | null;
}

const DmsAcronymsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AcronymRow | null>(null);
  const [formAcronym, setFormAcronym] = useState('');
  const [formTypeCode, setFormTypeCode] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const { data: acronyms = [], isLoading } = useQuery({
    queryKey: ['dms-acronyms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_document_type_acronyms')
        .select('*')
        .order('acronym');
      if (error) throw error;
      return data as AcronymRow[];
    }
  });

  const systemAcronyms = acronyms.filter(a => !a.is_learned);
  const learnedAcronyms = acronyms.filter(a => a.is_learned);

  const saveMutation = useMutation({
    mutationFn: async (item: Partial<AcronymRow>) => {
      if (editingItem) {
        const { error } = await supabase
          .from('dms_document_type_acronyms')
          .update({ acronym: item.acronym, type_code: item.type_code, full_name: item.full_name, notes: item.notes, updated_at: new Date().toISOString() })
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dms_document_type_acronyms')
          .insert({ acronym: item.acronym!, type_code: item.type_code!, full_name: item.full_name!, notes: item.notes, is_learned: false });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms-acronyms'] });
      toast.success(editingItem ? 'Acronym updated' : 'Acronym added');
      closeSheet();
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dms_document_type_acronyms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms-acronyms'] });
      toast.success('Acronym deleted');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dms_document_type_acronyms')
        .update({ is_learned: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms-acronyms'] });
      toast.success('Acronym approved as system acronym');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const openAdd = () => {
    setEditingItem(null);
    setFormAcronym('');
    setFormTypeCode('');
    setFormFullName('');
    setFormNotes('');
    setSheetOpen(true);
  };

  const openEdit = (item: AcronymRow) => {
    setEditingItem(item);
    setFormAcronym(item.acronym);
    setFormTypeCode(item.type_code);
    setFormFullName(item.full_name);
    setFormNotes(item.notes || '');
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (!formAcronym.trim() || !formTypeCode.trim() || !formFullName.trim()) {
      toast.error('Acronym, Type Code and Full Name are required');
      return;
    }
    saveMutation.mutate({
      acronym: formAcronym.trim().toUpperCase(),
      type_code: formTypeCode.trim(),
      full_name: formFullName.trim(),
      notes: formNotes.trim() || null
    });
  };

  const handleExport = () => {
    const headers = ['Acronym', 'Full Name', 'Type Code', 'Notes', 'Source', 'Usage Count', 'Created'];
    const rows = acronyms.map(a => [
      a.acronym,
      a.full_name,
      a.type_code,
      a.notes || '',
      a.is_learned ? 'Learned' : 'System',
      String(a.usage_count || 0),
      a.created_at ? new Date(a.created_at).toLocaleDateString() : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acronyms_export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported acronyms to CSV');
  };

  const filterFn = (a: AcronymRow) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.acronym.toLowerCase().includes(q) || a.full_name.toLowerCase().includes(q) || a.type_code.toLowerCase().includes(q);
  };

  const renderTable = (items: AcronymRow[], showActions: boolean, showUsage: boolean) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[100px] font-semibold">Acronym</TableHead>
            <TableHead className="font-semibold">Full Name</TableHead>
            <TableHead className="w-[90px] font-semibold">Code</TableHead>
            <TableHead className="font-semibold">Notes</TableHead>
            {showUsage && <TableHead className="w-[70px] font-semibold text-center">Uses</TableHead>}
            {showActions && <TableHead className="w-[100px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? (showUsage ? 6 : 5) : (showUsage ? 5 : 4)} className="text-center py-6 text-muted-foreground">
                {searchQuery ? 'No matching acronyms' : 'No acronyms in this category'}
              </TableCell>
            </TableRow>
          ) : items.filter(filterFn).map(row => (
            <TableRow key={row.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openEdit(row)}>
              <TableCell className="font-mono font-semibold text-primary uppercase">{row.acronym}</TableCell>
              <TableCell>{row.full_name}</TableCell>
              <TableCell className="font-mono text-muted-foreground">{row.type_code}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.notes || '—'}</TableCell>
              {showUsage && (
                <TableCell className="text-center">
                  <Badge variant="secondary" className="text-xs">{row.usage_count || 0}</Badge>
                </TableCell>
              )}
              {showActions && (
                <TableCell>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                      title="Approve as system acronym"
                      onClick={() => approveMutation.mutate(row.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search acronyms..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Badge variant="outline" className="whitespace-nowrap text-xs">
            {systemAcronyms.length} system · {learnedAcronyms.length} learned
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Acronym
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">System Acronyms</h3>
            {renderTable(systemAcronyms, false, true)}
          </div>

          {learnedAcronyms.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                Learned Acronyms
                <Badge variant="secondary" className="text-xs">{learnedAcronyms.length} new</Badge>
              </h3>
              {renderTable(learnedAcronyms, true, true)}
            </div>
          )}
        </>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md z-[150] flex flex-col">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>{editingItem ? 'Edit Acronym' : 'Add Acronym'}</SheetTitle>
            <SheetDescription>
              {editingItem ? 'Modify the acronym mapping below.' : 'Map an industry acronym to a document type code.'}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Acronym <span className="text-destructive">*</span></Label>
              <Input value={formAcronym} onChange={e => setFormAcronym(e.target.value.toUpperCase())} placeholder="e.g. BFD" maxLength={10} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Type Code <span className="text-destructive">*</span></Label>
              <Input value={formTypeCode} onChange={e => setFormTypeCode(e.target.value)} placeholder="e.g. 7704 or H02" maxLength={10} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></Label>
              <Input value={formFullName} onChange={e => setFormFullName(e.target.value)} placeholder="e.g. Basis of Design" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="e.g. Also written as BfD" />
            </div>
          </div>
          <SheetFooter className="pt-4 border-t">
            <Button variant="outline" onClick={closeSheet}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DmsAcronymsTab;
