import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Loader2, GripVertical, Trash2, X, ChevronDown, Settings2, ArrowLeft, ArrowRight } from 'lucide-react';
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
  { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', ring: 'ring-blue-500/20' },
  { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', ring: 'ring-amber-500/20' },
  { bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', ring: 'ring-rose-500/20' },
  { bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500', ring: 'ring-cyan-500/20' },
  { bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500', ring: 'ring-orange-500/20' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
  { bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', ring: 'ring-violet-500/20' },
  { bg: 'bg-pink-50 dark:bg-pink-950/40', border: 'border-pink-200 dark:border-pink-800', text: 'text-pink-700 dark:text-pink-300', dot: 'bg-pink-500', ring: 'ring-pink-500/20' },
  { bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500', ring: 'ring-teal-500/20' },
];

const SOURCE_TABLE_OPTIONS = [
  { value: 'none', label: 'Free Text (no lookup)', example: null },
  { value: 'dms_projects', label: 'Projects', example: '6529 — Capital Expansion Project' },
  { value: 'dms_originators', label: 'Originators', example: 'AMTS — AMTS Engineering' },
  { value: 'dms_plants', label: 'Plants', example: 'S003 — Sasol Secunda Plant 3' },
  { value: 'dms_sites', label: 'Sites', example: 'ISGP — Integrated Gas Plant' },
  { value: 'dms_units', label: 'Units', example: 'U11000 — Utilities Unit' },
  { value: 'dms_disciplines', label: 'Disciplines', example: 'PX — Process Engineering' },
  { value: 'dms_document_types', label: 'Document Types', example: '2365 — Process Engineering Flow Scheme' },
  { value: 'dms_status_codes', label: 'Status Codes', example: 'IFR — Issued for Review' },
];

const COL_MAP: Record<string, [string, string]> = {
  dms_projects: ['code', 'project_name'],
  dms_originators: ['code', 'description'],
  dms_plants: ['code', 'plant_name'],
  dms_sites: ['code', 'site_name'],
  dms_units: ['code', 'unit_name'],
  dms_disciplines: ['code', 'name'],
  dms_document_types: ['code', 'document_name'],
  dms_status_codes: ['code', 'description'],
};

const DMS_SYSTEMS = [
  { value: 'assai', label: 'Assai' },
  { value: 'documentum', label: 'Documentum' },
  { value: 'wrench', label: 'Wrench' },
  { value: 'sharepoint', label: 'SharePoint' },
  { value: 'custom', label: 'Custom / Other' },
];

const segmentsTable = () => (supabase as any).from('dms_numbering_segments');

/** Fetch one sample row from each source table to use as real examples */
const SOURCE_TABLES = Object.keys(COL_MAP);

const useSampleData = () => {
  return useQuery({
    queryKey: ['dms-sample-data'],
    queryFn: async () => {
      const results: Record<string, { code: string; name: string }> = {};
      await Promise.all(
        SOURCE_TABLES.map(async (table) => {
          const [codeCol, nameCol] = COL_MAP[table];
          const { data } = await (supabase as any)
            .from(table)
            .select(`${codeCol}, ${nameCol}`)
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .limit(5);
          // Pick the entry with the shortest combined text for better display
          if (data?.length) {
            const shortest = data.sort((a: any, b: any) => 
              (String(a[codeCol]) + a[nameCol]).length - (String(b[codeCol]) + b[nameCol]).length
            )[0];
            results[table] = { code: shortest[codeCol], name: shortest[nameCol] };
          }
        })
      );
      return results;
    },
    staleTime: 60_000,
  });
};

/** Always show AAAA, BBBB, CCCC pattern based on position index and max_length */
const segmentDisplayCode = (
  _seg: Segment,
  index: number,
  _samples?: Record<string, { code: string; name: string }>
): string => {
  const letter = String.fromCharCode(65 + (index % 26));
  const len = _seg.max_length || 4;
  return letter.repeat(len);
};

/** Get "CODE — Name" string for a segment's sample */
const segmentDisplayExample = (
  seg: Segment,
  samples: Record<string, { code: string; name: string }> | undefined
): string | null => {
  if (seg.source_table && samples?.[seg.source_table]) {
    const { code, name } = samples[seg.source_table];
    return `${code} — ${name}`;
  }
  return null;
};

const DmsConfigurationTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [dmsSystem, setDmsSystem] = useState('assai');
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

  const { data: sampleData } = useSampleData();

  const updateSegment = useMutation({
    mutationFn: async (seg: Partial<Segment> & { id: string }) => {
      const { id, ...updates } = seg;
      const { error } = await segmentsTable().update(updates).eq('id', id);
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

  const moveSegment = async (segId: string, direction: 'left' | 'right') => {
    const sorted = [...segments].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex(s => s.id === segId);
    const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
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
    setAdvancedOpen(false);
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
    setAdvancedOpen(false);
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

  const sorted = [...segments].sort((a, b) => a.position - b.position);
  const activeSegments = sorted.filter(s => s.is_active);

  const selectedSourceExample = SOURCE_TABLE_OPTIONS.find(o => o.value === formSourceTable)?.example;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Document Numbering Structure</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Click on any segment to configure it. Drag or use arrows to reorder.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dmsSystem} onValueChange={setDmsSystem}>
            <SelectTrigger className="w-[160px] h-9">
              <Settings2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DMS_SYSTEMS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Segment Boxes */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          {/* Interactive segment boxes */}
          <div className="flex flex-wrap items-start gap-2">
            {sorted.map((seg, idx) => {
              const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
              return (
                <React.Fragment key={seg.id}>
                  <div className="group relative flex flex-col items-center">
                    <button
                      onClick={() => openEdit(seg)}
                      className={cn(
                        'relative flex flex-col items-center rounded-xl border-2 px-4 py-3 min-w-[90px] transition-all duration-200',
                        'hover:shadow-md hover:scale-[1.03] active:scale-[0.98] cursor-pointer',
                        'focus:outline-none focus:ring-2 focus:ring-offset-2',
                        color.bg, color.border, color.ring,
                        !seg.is_active && 'opacity-40 grayscale'
                      )}
                    >
                      {/* Position badge */}
                      <span className={cn(
                        'absolute -top-2 -left-2 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white',
                        color.dot
                      )}>
                        {idx + 1}
                      </span>

                      {/* Example value */}
                      <span className={cn('font-mono text-sm font-bold leading-none', color.text)}>
                        {segmentDisplayCode(seg, idx, sampleData)}
                      </span>

                      {/* Label */}
                      <span className="text-[10px] text-muted-foreground mt-1.5 leading-tight max-w-[100px] truncate font-medium">
                        {seg.label}
                      </span>

                    </button>


                    {/* Hover actions */}
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-background shadow-sm border"
                        onClick={(e) => { e.stopPropagation(); moveSegment(seg.id, 'left'); }}
                        disabled={idx === 0}
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-background shadow-sm border text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteSegment.mutate(seg.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-background shadow-sm border"
                        onClick={(e) => { e.stopPropagation(); moveSegment(seg.id, 'right'); }}
                        disabled={idx === sorted.length - 1}
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Separator between boxes */}
                  {idx < sorted.length - 1 && (
                    <span className="text-lg font-bold text-muted-foreground/50 select-none mx-0.5">
                      {seg.separator || '-'}
                    </span>
                  )}
                </React.Fragment>
              );
            })}

            {/* Add new segment button */}
            <button
              onClick={openCreate}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 px-4 py-3 min-w-[90px] min-h-[68px]',
                'hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer',
                'text-muted-foreground hover:text-primary'
              )}
            >
              <Plus className="h-5 w-5" />
              <span className="text-[10px] mt-1">Add</span>
            </button>
          </div>

          {/* Example document number with breakdown */}
          {activeSegments.length > 0 && (
            <div className="mt-8 pt-4 border-t border-border/50">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Example</Label>
              <div className="bg-muted/40 rounded-lg px-4 py-3 border border-dashed border-border">
                <span className="font-mono text-sm tracking-wide text-foreground font-semibold">
                  {activeSegments.map((s, i) => {
                    const sample = s.source_table && sampleData?.[s.source_table];
                    const code = sample ? sample.code : '001';
                    return (
                      <React.Fragment key={s.id}>
                        <span>{code}</span>
                        {i < activeSegments.length - 1 && (
                          <span className="text-muted-foreground/60">{s.separator || '-'}</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border/30">
                  {activeSegments.map((s) => {
                    const sample = s.source_table && sampleData?.[s.source_table];
                    const code = sample ? sample.code : '001';
                    const meaning = sample ? sample.name : s.label;
                    return (
                      <span key={s.id} className="text-[11px] text-muted-foreground">
                        <span className="font-mono font-semibold text-foreground/80">{code}</span>
                        <span className="mx-1">=</span>
                        <span className="italic">{meaning}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Segment Configuration Modal */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {isCreating ? 'Add New Segment' : 'Configure Segment'}
            </DialogTitle>
            <DialogDescription>
              {isCreating
                ? 'Define a new segment for the document numbering pattern.'
                : `Editing the "${editingSegment?.label}" segment.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Segment Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Segment Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formLabel}
                onChange={e => setFormLabel(e.target.value)}
                placeholder="e.g. Project Code, Discipline, Sequence Number"
                className="h-10"
              />
            </div>


            {/* Data Source */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Source</Label>
              <Select value={formSourceTable} onValueChange={(val) => {
                setFormSourceTable(val);
                if (COL_MAP[val]) {
                  setFormSourceCodeCol(COL_MAP[val][0]);
                  setFormSourceNameCol(COL_MAP[val][1]);
                }
              }}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a data source..." />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TABLE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Example preview for selected source */}
              {selectedSourceExample && (
                <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border/60 px-3 py-2.5">
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground/70">Example:</span>{' '}
                    <span className="font-mono">{selectedSourceExample}</span>
                  </span>
                </div>
              )}
              {formSourceTable === 'none' && (
                <p className="text-xs text-muted-foreground">
                  Users will type a value manually (e.g. free-text sequence numbers).
                </p>
              )}
            </div>

            {/* Format Rules */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Format Rules</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min Characters</Label>
                  <Input
                    type="number"
                    value={formMinLength}
                    onChange={e => setFormMinLength(Number(e.target.value))}
                    min={1}
                    max={20}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Max Characters</Label>
                  <Input
                    type="number"
                    value={formMaxLength}
                    onChange={e => setFormMaxLength(Number(e.target.value))}
                    min={1}
                    max={20}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Separator After</Label>
                  <Input
                    value={formSeparator}
                    onChange={e => setFormSeparator(e.target.value)}
                    className="h-9 font-mono text-center"
                    maxLength={2}
                    placeholder="-"
                  />
                </div>
              </div>
            </div>

            {/* Behaviour */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Behaviour</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div>
                    <span className="text-sm font-medium">Required</span>
                    <p className="text-xs text-muted-foreground">Must be present in every document number</p>
                  </div>
                  <Switch checked={formRequired} onCheckedChange={setFormRequired} />
                </div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div>
                    <span className="text-sm font-medium">Active</span>
                    <p className="text-xs text-muted-foreground">Include this segment in the pattern</p>
                  </div>
                  <Switch checked={formActive} onCheckedChange={setFormActive} />
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', advancedOpen && 'rotate-180')} />
                  Advanced Settings
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Internal Key</Label>
                  <Input
                    value={formKey}
                    onChange={e => setFormKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="h-9 font-mono text-xs"
                    placeholder="e.g. project, discipline, sequence_1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Example Value</Label>
                  <Input
                    value={formExample}
                    onChange={e => setFormExample(e.target.value)}
                    className="h-9 font-mono text-xs"
                    placeholder="e.g. 6529, AMTS, PX"
                  />
                  <p className="text-[11px] text-muted-foreground">Shown inside the segment box in the visual builder</p>
                </div>
                {formSourceTable !== 'none' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Code Column</Label>
                      <Input value={formSourceCodeCol} onChange={e => setFormSourceCodeCol(e.target.value)} className="h-9 font-mono text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Display Column</Label>
                      <Input value={formSourceNameCol} onChange={e => setFormSourceNameCol(e.target.value)} className="h-9 font-mono text-xs" />
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditDialog(false)} className="h-9">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateSegment.isPending || createSegment.isPending || !formLabel.trim()}
              className="h-9 min-w-[120px]"
            >
              {(updateSegment.isPending || createSegment.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {isCreating ? 'Add Segment' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DmsConfigurationTab;
