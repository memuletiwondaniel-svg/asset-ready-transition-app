import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Plus, Trash2, Search, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AcronymRow {
  id: string;
  acronym: string;
  type_code: string;
  full_name: string;
  notes: string | null;
  created_at: string;
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

  const saveMutation = useMutation({
    mutationFn: async (item: Partial<AcronymRow>) => {
      if (editingItem) {
        const { error } = await supabase
          .from('dms_document_type_acronyms')
          .update({ acronym: item.acronym, type_code: item.type_code, full_name: item.full_name, notes: item.notes })
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dms_document_type_acronyms')
          .insert({ acronym: item.acronym!, type_code: item.type_code!, full_name: item.full_name!, notes: item.notes });
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

  const filtered = acronyms.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.acronym.toLowerCase().includes(q) || a.full_name.toLowerCase().includes(q) || a.type_code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search acronyms..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Acronym
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[120px] font-semibold">Acronym</TableHead>
              <TableHead className="font-semibold">Full Name</TableHead>
              <TableHead className="w-[100px] font-semibold">Type Code</TableHead>
              <TableHead className="font-semibold">Notes</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No matching acronyms' : 'No acronyms configured yet'}
                </TableCell>
              </TableRow>
            ) : filtered.map(row => (
              <TableRow key={row.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openEdit(row)}>
                <TableCell className="font-mono font-semibold text-primary">{row.acronym}</TableCell>
                <TableCell>{row.full_name}</TableCell>
                <TableCell className="font-mono text-muted-foreground">{row.type_code}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.notes || '—'}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={e => { e.stopPropagation(); deleteMutation.mutate(row.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
