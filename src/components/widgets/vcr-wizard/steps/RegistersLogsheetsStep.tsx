import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Combobox } from '@/components/ui/combobox';
import { ClipboardList, Plus, Pencil, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { STANDARD_REGISTERS } from '@/lib/registerCatalog';

interface RegistersLogsheetsStepProps {
  vcrId: string;
}

type ItemType = 'register' | 'logsheet';
type Action = 'new' | 'update';

interface MergedItem {
  id: string;
  type: ItemType;
  name: string;
  action: Action;
  notes?: string | null;
  display_order: number;
}

interface EditTarget {
  id: string;
  type: ItemType;
  name: string;
  action: Action;
  notes: string;
}

export const RegistersLogsheetsStep: React.FC<RegistersLogsheetsStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: ItemType } | null>(null);

  const { data: registers = [] } = useQuery({
    queryKey: ['vcr-register-selections', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_register_selections')
        .select('id, name, catalog_id, action_type, notes, display_order, catalog:p2a_vcr_register_catalog(name)')
        .eq('handover_point_id', vcrId)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: logsheets = [] } = useQuery({
    queryKey: ['vcr-logsheets', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_logsheets')
        .select('id, title, action_type, notes, display_order')
        .eq('handover_point_id', vcrId)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const registerItems: MergedItem[] = useMemo(() => registers.map((r: any) => ({
    id: r.id,
    type: 'register' as const,
    name: r.catalog?.name || r.name || 'Untitled Register',
    action: (r.action_type === 'update' ? 'update' : 'new') as Action,
    notes: r.notes,
    display_order: r.display_order,
  })), [registers]);

  const logsheetItems: MergedItem[] = useMemo(() => logsheets.map((l: any) => ({
    id: l.id,
    type: 'logsheet' as const,
    name: l.title,
    action: (l.action_type === 'update' ? 'update' : 'new') as Action,
    notes: l.notes,
    display_order: l.display_order,
  })), [logsheets]);

  const totalCount = registerItems.length + logsheetItems.length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vcr-register-selections', vcrId] });
    queryClient.invalidateQueries({ queryKey: ['vcr-logsheets', vcrId] });
  };

  const deleteItem = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: ItemType }) => {
      const table = type === 'register' ? 'p2a_vcr_register_selections' : 'p2a_vcr_logsheets';
      const { error } = await (supabase as any).from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success('Item removed');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to remove'),
  });

  const openAdd = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = (item: MergedItem) => {
    setEditTarget({
      id: item.id,
      type: item.type,
      name: item.name,
      action: item.action,
      notes: item.notes || '',
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {totalCount > 0 && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-base font-medium">Registers &amp; Logsheets</h3>
            <p className="text-[13px] text-muted-foreground leading-[1.5] mt-0.5">
              Identify the operational Registers and Logsheets required for this VCR.
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {registerItems.length > 0 && (
                <span
                  className="text-[12px] font-medium px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#E6F1FB', color: '#0C447C' }}
                >
                  Registers {registerItems.length}
                </span>
              )}
              {logsheetItems.length > 0 && (
                <span
                  className="text-[12px] font-medium px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#E1F5EE', color: '#085041' }}
                >
                  Logsheets {logsheetItems.length}
                </span>
              )}
              <span className="text-[12px] text-muted-foreground">for this VCR</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add item
          </Button>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center mb-4">
            <ClipboardList className="w-[22px] h-[22px] text-muted-foreground" />
          </div>
          <h3 className="text-[14px] font-medium">No Registers or Logsheets yet</h3>
          <p className="text-[13px] text-muted-foreground mt-2 max-w-[380px] leading-[1.5]">
            Capture the operational Registers and Logsheets required for this VCR. Common examples: LOLC Register, Spade &amp; Blind Register, Override Register, daily operations Logsheets.
          </p>
          <Button variant="outline" size="sm" onClick={openAdd} className="mt-4 gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add first item
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          {registerItems.length > 0 && (
            <>
              <GroupHeader label="Registers" />
              {registerItems.map((item, idx) => (
                <Row
                  key={item.id}
                  item={item}
                  isFirst={idx === 0}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setDeleteTarget({ id: item.id, type: item.type })}
                />
              ))}
            </>
          )}
          {logsheetItems.length > 0 && (
            <>
              <GroupHeader label="Logsheets" withTopBorder={registerItems.length > 0} />
              {logsheetItems.map((item, idx) => (
                <Row
                  key={item.id}
                  item={item}
                  isFirst={idx === 0 && registerItems.length === 0}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setDeleteTarget({ id: item.id, type: item.type })}
                />
              ))}
            </>
          )}
        </div>
      )}

      <AddEditModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditTarget(null); }}
        vcrId={vcrId}
        editTarget={editTarget}
        onSaved={invalidate}
        nextRegisterOrder={registerItems.length}
        nextLogsheetOrder={logsheetItems.length}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteItem.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Group Header ────────────────────────────────────────────────────────────

const GroupHeader: React.FC<{ label: string; withTopBorder?: boolean }> = ({ label, withTopBorder }) => (
  <div
    className={cn(
      'px-3.5 py-2 bg-muted/60 text-[11px] font-medium text-muted-foreground uppercase',
      withTopBorder && 'border-t border-border',
    )}
    style={{ letterSpacing: '0.04em' }}
  >
    {label}
  </div>
);

// ─── Row ─────────────────────────────────────────────────────────────────────

const Row: React.FC<{
  item: MergedItem;
  isFirst: boolean;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, isFirst, onEdit, onDelete }) => {
  const isRegister = item.type === 'register';
  return (
    <div
      onClick={onEdit}
      className={cn(
        'group grid items-center gap-3 px-3.5 py-3 text-[13px] cursor-pointer hover:bg-muted/30 transition-colors',
        !isFirst && 'border-t border-border',
      )}
      style={{ gridTemplateColumns: '1fr 60px 100px 60px' }}
    >
      <div className="font-medium text-foreground truncate">{item.name}</div>
      <div className="flex justify-center">
        <span
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-medium"
          style={
            isRegister
              ? { backgroundColor: '#E6F1FB', color: '#0C447C' }
              : { backgroundColor: '#E1F5EE', color: '#085041' }
          }
        >
          {isRegister ? 'R' : 'L'}
        </span>
      </div>
      <div className="flex justify-start">
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
          {item.action === 'new' ? 'Develop new' : 'Update existing'}
        </span>
      </div>
      <div
        className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onEdit}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ─── Add / Edit Modal ────────────────────────────────────────────────────────

const AddEditModal: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vcrId: string;
  editTarget: EditTarget | null;
  onSaved: () => void;
  nextRegisterOrder: number;
  nextLogsheetOrder: number;
}> = ({ open, onOpenChange, vcrId, editTarget, onSaved, nextRegisterOrder, nextLogsheetOrder }) => {
  const isEdit = !!editTarget;
  const [type, setType] = useState<ItemType>('register');
  const [name, setName] = useState('');
  const [action, setAction] = useState<Action>('new');
  const [notes, setNotes] = useState('');
  const [addAnother, setAddAnother] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editTarget) {
      setType(editTarget.type);
      setName(editTarget.name);
      setAction(editTarget.action);
      setNotes(editTarget.notes);
      setAddAnother(false);
    } else {
      setType('register');
      setName('');
      setAction('new');
      setNotes('');
    }
  }, [open, editTarget]);

  const canSubmit = !!name.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      if (isEdit && editTarget) {
        const table = editTarget.type === 'register' ? 'p2a_vcr_register_selections' : 'p2a_vcr_logsheets';
        const updates: any = editTarget.type === 'register'
          ? { name: name.trim(), catalog_id: null, action_type: action, notes: notes || null }
          : { title: name.trim(), action_type: action, notes: notes || null };
        const { error } = await (supabase as any).from(table).update(updates).eq('id', editTarget.id);
        if (error) throw error;
        toast.success('Saved');
        onSaved();
        onOpenChange(false);
      } else if (type === 'register') {
        const { error } = await (supabase as any).from('p2a_vcr_register_selections').insert({
          handover_point_id: vcrId,
          name: name.trim(),
          catalog_id: null,
          action_type: action,
          notes: notes || null,
          display_order: nextRegisterOrder,
        });
        if (error) throw error;
        toast.success('Register added');
        onSaved();
        if (addAnother) {
          setName('');
          setNotes('');
        } else {
          onOpenChange(false);
        }
      } else {
        const { error } = await (supabase as any).from('p2a_vcr_logsheets').insert({
          handover_point_id: vcrId,
          title: name.trim(),
          action_type: action,
          notes: notes || null,
          display_order: nextLogsheetOrder,
        });
        if (error) throw error;
        toast.success('Logsheet added');
        onSaved();
        if (addAnother) {
          setName('');
          setNotes('');
        } else {
          onOpenChange(false);
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[460px] p-0 gap-0 border-0"
        hideCloseButton
      >
        <div className="px-6 pt-5 pb-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-[16px] font-medium">
                {isEdit ? 'Edit Register or Logsheet' : 'Add Register or Logsheet'}
              </h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Capture an operational document required for this VCR.
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Type */}
          {!isEdit && (
            <div className="mb-3.5">
              <div className="text-[12px] text-muted-foreground mb-1.5">Type</div>
              <div className="grid grid-cols-2 gap-2">
                <TypeCard
                  active={type === 'register'}
                  title="Register"
                  desc="Standard operational Register (LOLC, Spade & Blind, etc.)"
                  onClick={() => { setType('register'); setName(''); }}
                />
                <TypeCard
                  active={type === 'logsheet'}
                  title="Logsheet"
                  desc="Operational Logsheet for daily activities"
                  onClick={() => { setType('logsheet'); setName(''); }}
                />
              </div>
            </div>
          )}

          {/* Name */}
          <div className="mb-3.5">
            <div className="text-[12px] text-muted-foreground mb-1.5">Name</div>
            {type === 'register' ? (
              <>
                <Combobox
                  value={name}
                  onValueChange={setName}
                  items={STANDARD_REGISTERS}
                  placeholder="Select a Register…"
                  searchPlaceholder="Search or type custom name…"
                  emptyText="No matching Register."
                  allowCustom
                  onAddCustom={(v) => setName(v)}
                  className="h-9 text-[13px]"
                />
                <p className="text-[11px] text-muted-foreground/80 mt-1">
                  Choose from the standard list or type to add a custom name.
                </p>
              </>
            ) : (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Compressor Daily Operations Logsheet, Pump Performance Logsheet"
                className="h-9 text-[13px]"
              />
            )}
          </div>

          {/* Action */}
          <div className="mb-3.5">
            <div className="text-[12px] text-muted-foreground mb-1.5">Action</div>
            <div className="grid grid-cols-2 gap-2">
              <TypeCard
                active={action === 'new'}
                title="Develop new"
                desc="Create from scratch for this VCR"
                onClick={() => setAction('new')}
              />
              <TypeCard
                active={action === 'update'}
                title="Update existing"
                desc="Modify an existing Register or Logsheet"
                onClick={() => setAction('update')}
              />
            </div>
          </div>

          {/* Comments */}
          <div className="mb-3.5">
            <div className="text-[12px] text-muted-foreground mb-1.5">Comments (optional)</div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Scope, timing, responsibility, references…"
              className="text-[13px] min-h-[60px]"
            />
          </div>

          {/* Add another */}
          {!isEdit && (
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <Checkbox
                checked={addAnother}
                onCheckedChange={(c) => setAddAnother(c === true)}
              />
              <span className="text-[12px] text-muted-foreground">Add another after this one</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TypeCard: React.FC<{
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}> = ({ active, title, desc, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'text-left rounded-md border px-3 py-2.5 transition-colors',
      active
        ? 'border-[#9CC4E8] bg-[#E6F1FB]'
        : 'border-border hover:bg-muted/40',
    )}
  >
    <div className="text-[13px] font-medium text-foreground">{title}</div>
    <div className="text-[11px] text-muted-foreground leading-[1.4] mt-0.5">{desc}</div>
  </button>
);
