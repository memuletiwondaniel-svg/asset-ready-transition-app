import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, ArrowUp, ArrowDown, Loader2, Info, Eye, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Segment {
  id: string;
  segment_key: string;
  label: string;
  position: number;
  separator: string;
  min_length: number;
  max_length: number;
  source_table: string | null;
  source_code_column: string | null;
  source_name_column: string | null;
  is_required: boolean;
  is_active: boolean;
  description: string | null;
  example_value: string | null;
}

const SEGMENT_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
];

const SOURCE_TABLE_OPTIONS = [
  { value: 'none', label: 'Free Text (no lookup)' },
  { value: 'dms_projects', label: 'Projects' },
  { value: 'dms_originators', label: 'Originators' },
  { value: 'dms_plants', label: 'Plants' },
  { value: 'dms_sites', label: 'Sites' },
  { value: 'dms_units', label: 'Units' },
  { value: 'dms_disciplines', label: 'Disciplines' },
  { value: 'dms_document_types', label: 'Document Types' },
  { value: 'dms_status_codes', label: 'Status Codes' },
];

const DMS_SYSTEMS = [
  { value: 'assai', label: 'Assai' },
  { value: 'documentum', label: 'Documentum' },
  { value: 'wrench', label: 'Wrench' },
  { value: 'sharepoint', label: 'SharePoint' },
  { value: 'custom', label: 'Custom / Other' },
];

// Helper to query the new table (not yet in generated types)
const segmentsTable = () => (supabase as any).from('dms_numbering_segments');

const DmsConfigurationTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [dmsSystem, setDmsSystem] = useState('assai');

  // Form state
  const [formLabel, setFormLabel] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formSeparator, setFormSeparator] = useState('-');
  const [formMinLength, setFormMinLength] = useState(1);
  const [formMaxLength, setFormMaxLength] = useState(10);
  const [formSourceTable, setFormSourceTable] = useState('none');
  const [formSourceCodeCol, setFormSourceCodeCol] = useState('code');
  const [formSourceNameCol, setFormSourceNameCol] = useState('');
  const [formRequired, setFormRequired] = useState(true);
  const [formActive, setFormActive] = useState(true);
  const [formDescription, setFormDescription] = useState('');
  const [formExample, setFormExample] = useState('');

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['dms-numbering-segments'],
    queryFn: async () => {
      const { data, error } = await segmentsTable()
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return (data || []) as Segment[];
    },
  });

  const updateSegment = useMutation({
    mutationFn: async (seg: Partial<Segment> & { id: string }) => {
      const { id, ...updates } = seg;
      const { error } = await segmentsTable()
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms-numbering-segments'] });
      toast.success('Segment updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createSegment = useMutation({
    mutationFn: async () => {
      const nextPosition = segments.length > 0 ? Math.max(...segments.map(s => s.position)) + 1 : 1;
      const { error } = await segmentsTable().insert({
        segment_key: formKey || `custom_${nextPosition}`,
        label: formLabel || 'New Segment',
        position: nextPosition,
        separator: formSeparator,
        min_length: formMinLength,
        max_length: formMaxLength,
        source_table: formSourceTable === 'none' ? null : formSourceTable,
        source_code_column: formSourceTable === 'none' ? null : formSourceCodeCol,
        source_name_column: formSourceTable === 'none' ? null : formSourceNameCol,
        is_required: formRequired,
        is_active: formActive,
        description: formDescription || null,
        example_value: formExample || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms-numbering-segments'] });
      toast.success('Segment added');
      setEditDialog(false);
      setIsCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSegment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await segmentsTable().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms-numbering-segments'] });
      toast.success('Segment removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveSegment = async (segId: string, direction: 'up' | 'down') => {
    const sorted = [...segments].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex(s => s.id === segId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];
    await Promise.all([
      segmentsTable().update({ position: b.position }).eq('id', a.id),
      segmentsTable().update({ position: a.position }).eq('id', b.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ['dms-numbering-segments'] });
  };

  const resetForm = () => {
    setFormLabel('');
    setFormKey('');
    setFormSeparator('-');
    setFormMinLength(1);
    setFormMaxLength(10);
    setFormSourceTable('none');
    setFormSourceCodeCol('code');
    setFormSourceNameCol('');
    setFormRequired(true);
    setFormActive(true);
    setFormDescription('');
    setFormExample('');
  };

  const openCreate = () => {
    setEditingSegment(null);
    setIsCreating(true);
    resetForm();
    setEditDialog(true);
  };

  const openEdit = (seg: Segment) => {
    setEditingSegment(seg);
    setIsCreating(false);
    setFormLabel(seg.label);
    setFormKey(seg.segment_key);
    setFormSeparator(seg.separator);
    setFormMinLength(seg.min_length);
    setFormMaxLength(seg.max_length);
    setFormSourceTable(seg.source_table || 'none');
    setFormSourceCodeCol(seg.source_code_column || 'code');
    setFormSourceNameCol(seg.source_name_column || '');
    setFormRequired(seg.is_required);
    setFormActive(seg.is_active);
    setFormDescription(seg.description || '');
    setFormExample(seg.example_value || '');
    setEditDialog(true);
  };

  const handleSave = () => {
    if (isCreating) {
      createSegment.mutate();
      return;
    }
    if (!editingSegment) return;
    updateSegment.mutate({
      id: editingSegment.id,
      label: formLabel,
      segment_key: formKey,
      separator: formSeparator,
      min_length: formMinLength,
      max_length: formMaxLength,
      source_table: formSourceTable === 'none' ? null : formSourceTable,
      source_code_column: formSourceTable === 'none' ? null : formSourceCodeCol,
      source_name_column: formSourceTable === 'none' ? null : formSourceNameCol,
      is_required: formRequired,
      is_active: formActive,
      description: formDescription || null,
      example_value: formExample || null,
    }, {
      onSuccess: () => setEditDialog(false),
    });
  };

  const activeSegments = segments.filter(s => s.is_active).sort((a, b) => a.position - b.position);
  const previewParts = activeSegments.map((s, i) => ({
    label: s.label,
    value: s.example_value || s.segment_key.toUpperCase(),
    separator: i < activeSegments.length - 1 ? s.separator : '',
    colorClass: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));

  const sourceTableLabel = (table: string | null) => {
    if (!table) return 'Free Text';
    return SOURCE_TABLE_OPTIONS.find(o => o.value === table)?.label || table;
  };

  return (
    <div className="space-y-4">
      {/* Live Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Document Number Preview</CardTitle>
          </div>
          <CardDescription>Live preview of the assembled document number pattern</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex flex-wrap items-center gap-0.5 font-mono text-sm">
              {previewParts.map((part, i) => (
                <React.Fragment key={i}>
                  <span className={cn('px-2 py-1 rounded font-semibold', part.colorClass)}>
                    {part.value}
                  </span>
                  {part.separator && (
                    <span className="text-muted-foreground font-bold">{part.separator}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              {previewParts.map((part, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className={cn('h-2 w-2 rounded-full', SEGMENT_COLORS[i % SEGMENT_COLORS.length].split(' ')[0])} />
                  {part.label}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DMS System Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">DMS System Settings</CardTitle>
          </div>
          <CardDescription>Configure the target Document Management System for integration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Target DMS</Label>
              <Select value={dmsSystem} onValueChange={setDmsSystem}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DMS_SYSTEMS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Default Separator</Label>
              <Input
                value="-"
                disabled
                className="font-mono w-20"
                maxLength={2}
              />
              <p className="text-xs text-muted-foreground">Edit individual separators in the segments table</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segments Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Numbering Segments</CardTitle>
              <CardDescription>Define, reorder, and configure each segment of the document number</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Segment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 max-h-[calc(100vh-480px)] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="hidden md:table-cell">Key</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="hidden lg:table-cell">Length</TableHead>
                  <TableHead className="hidden lg:table-cell">Sep</TableHead>
                  <TableHead className="w-16">Req</TableHead>
                  <TableHead className="w-16">Active</TableHead>
                  <TableHead className="hidden md:table-cell">Example</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.sort((a, b) => a.position - b.position).map((seg, idx) => (
                  <TableRow key={seg.id} className="group">
                    <TableCell className="font-mono text-muted-foreground text-xs">{seg.position}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full shrink-0', SEGMENT_COLORS[idx % SEGMENT_COLORS.length].split(' ')[0])} />
                        <span className="font-medium text-sm">{seg.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{seg.segment_key}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {sourceTableLabel(seg.source_table)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                      {seg.min_length}–{seg.max_length}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-sm">
                      {seg.separator || '∅'}
                    </TableCell>
                    <TableCell>
                      {seg.is_required ? (
                        <Badge variant="default" className="text-[10px] px-1.5">Yes</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={seg.is_active}
                        onCheckedChange={(checked) => updateSegment.mutate({ id: seg.id, is_active: checked })}
                        className="scale-75"
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {seg.example_value || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSegment(seg.id, 'up')} disabled={idx === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSegment(seg.id, 'down')} disabled={idx === segments.length - 1}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(seg)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteSegment.mutate(seg.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle>{isCreating ? 'Add Segment' : 'Edit Segment'}</DialogTitle>
            <DialogDescription>{isCreating ? 'Define a new segment for the document number' : 'Configure how this segment behaves in the document number'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Label</Label>
                <Input value={formLabel} onChange={e => setFormLabel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Key</Label>
                <Input value={formKey} onChange={e => setFormKey(e.target.value)} className="font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Min Length</Label>
                <Input type="number" value={formMinLength} onChange={e => setFormMinLength(Number(e.target.value))} min={1} max={20} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Max Length</Label>
                <Input type="number" value={formMaxLength} onChange={e => setFormMaxLength(Number(e.target.value))} min={1} max={20} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Separator</Label>
                <Input value={formSeparator} onChange={e => setFormSeparator(e.target.value)} className="font-mono" maxLength={2} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Source Table</Label>
              <Select value={formSourceTable} onValueChange={setFormSourceTable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TABLE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formSourceTable !== 'none' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Code Column</Label>
                  <Input value={formSourceCodeCol} onChange={e => setFormSourceCodeCol(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Name Column</Label>
                  <Input value={formSourceNameCol} onChange={e => setFormSourceNameCol(e.target.value)} className="font-mono text-xs" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Example Value</Label>
              <Input value={formExample} onChange={e => setFormExample(e.target.value)} className="font-mono" placeholder="e.g. 6529" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} placeholder="Explain what this segment represents..." />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Required</Label>
                <p className="text-xs text-muted-foreground">Must be present in every document number</p>
              </div>
              <Switch checked={formRequired} onCheckedChange={setFormRequired} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">Include this segment in the numbering pattern</p>
              </div>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateSegment.isPending || createSegment.isPending} className="min-w-[100px]">
              {(updateSegment.isPending || createSegment.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isCreating ? 'Add Segment' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DmsConfigurationTab;
