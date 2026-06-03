import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit2, Check, Key, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddVCRModal } from './AddVCRModal';
import { shortVCRCode } from './phases/vcrDisplayUtils';

export interface WizardVCR {
  id: string;
  name: string;
  reason: string;
  targetMilestone: string;
  code?: string;
  assignedSystemIds?: string[];
}

interface VCRCreationStepProps {
  vcrs: WizardVCR[];
  projectCode: string;
  onVCRsChange: (vcrs: WizardVCR[]) => void;
}

export const VCRCreationStep: React.FC<VCRCreationStepProps> = ({
  vcrs,
  projectCode,
  onVCRsChange,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WizardVCR | null>(null);

  const generateVCRCode = (index: number) => {
    const cleanCode = projectCode.replace(/-/g, '');
    return `VCR-${cleanCode}-${String(index + 1).padStart(2, '0')}`;
  };

  const handleAddVCR = (vcr: WizardVCR) => {
    onVCRsChange([...vcrs, vcr]);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const updated = vcrs.filter(v => v.id !== deleteTarget.id);
    onVCRsChange(updated.map((v, i) => ({ ...v, code: generateVCRCode(i) })));
    setDeleteTarget(null);
  };

  const handleUpdateVCR = (id: string, updates: Partial<WizardVCR>) => {
    onVCRsChange(vcrs.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const vcrsByCode = vcrs.map((v, i) => ({ ...v, code: generateVCRCode(i) }));

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">
            Verification Certificates of Readiness{vcrs.length > 0 && (
              <span className="text-muted-foreground font-normal"> ({vcrs.length})</span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">Create VCRs for logical handover of Systems</p>
        </div>
        {vcrs.length > 0 && (
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAddModal(true)}>
            <Plus className="h-3.5 w-3.5" /> Add VCR
          </Button>
        )}
      </div>

      {/* VCR List */}
      <div className="border rounded-lg flex-1 min-h-0 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {vcrs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Key className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No VCRs created yet</p>
                <p className="text-xs mt-0.5 mb-4">Add a VCR to get started</p>
                <Button size="sm" className="gap-1" onClick={() => setShowAddModal(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add VCR
                </Button>
              </div>
            ) : (
              vcrsByCode.map((vcr) => (
                <div
                  key={vcr.id}
                  className={cn(
                    "group relative p-3 rounded-lg border bg-card transition-all duration-200",
                    "hover:bg-muted/40 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
                    "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-r before:bg-primary before:opacity-0 before:transition-opacity hover:before:opacity-100",
                    editingId === vcr.id && "ring-2 ring-primary"
                  )}
                >
                  {editingId === vcr.id ? (
                    <div className="space-y-3">
                      <Input
                        value={vcr.name}
                        onChange={(e) => handleUpdateVCR(vcr.id, { name: e.target.value })}
                        placeholder="VCR Name"
                        className="h-8 text-sm"
                      />
                      <Textarea
                        value={vcr.reason}
                        onChange={(e) => handleUpdateVCR(vcr.id, { reason: e.target.value })}
                        placeholder="Description..."
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm transition-colors group-hover:text-primary">{vcr.name}</span>
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border bg-muted text-muted-foreground border-border transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:shadow-sm group-hover:scale-105">
                            {shortVCRCode(vcr.code)}
                          </span>
                        </div>
                        {vcr.reason && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {vcr.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingId(vcr.id)}
                          aria-label="Edit VCR"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(vcr)}
                          aria-label="Delete VCR"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Add VCR Modal */}
      <AddVCRModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={handleAddVCR}
        generatedCode={generateVCRCode(vcrs.length)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent
          className="z-[300]"
          overlayClassName="z-[299] bg-black/70 backdrop-blur-sm"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Delete {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>This VCR will be removed from the draft plan.</p>
                {(deleteTarget?.assignedSystemIds?.length ?? 0) > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-2 text-amber-800 dark:text-amber-200 text-sm">
                    {deleteTarget?.assignedSystemIds?.length} system
                    {deleteTarget?.assignedSystemIds?.length === 1 ? '' : 's'} currently assigned
                    will be unassigned (returned to the Assign Systems pool).
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  This is a draft change — nothing is finalized until you submit the plan.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete VCR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
