import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit2, RotateCcw } from 'lucide-react';

export interface ChecklistItemOverride {
  topic?: string;
  description?: string;
  supporting_evidence?: string;
  approvers?: string;
  responsible?: string;
}

interface ChecklistItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    topic: string | null;
    description: string;
    supporting_evidence: string | null;
    approvers: string | null;
    responsible: string | null;
    sequence_number: number;
  } | null;
  currentOverride?: ChecklistItemOverride;
  onSave: (itemId: string, override: ChecklistItemOverride) => void;
  onReset: (itemId: string) => void;
}

const ChecklistItemEditDialog: React.FC<ChecklistItemEditDialogProps> = ({
  open,
  onOpenChange,
  item,
  currentOverride,
  onSave,
  onReset,
}) => {
  const [formData, setFormData] = useState<ChecklistItemOverride>({});

  useEffect(() => {
    if (item && open) {
      // Initialize form with override values or original values
      setFormData({
        topic: currentOverride?.topic ?? item.topic ?? '',
        description: currentOverride?.description ?? item.description ?? '',
        supporting_evidence: currentOverride?.supporting_evidence ?? item.supporting_evidence ?? '',
        approvers: currentOverride?.approvers ?? item.approvers ?? '',
        responsible: currentOverride?.responsible ?? item.responsible ?? '',
      });
    }
  }, [item, currentOverride, open]);

  if (!item) return null;

  const hasOverrides = currentOverride && Object.keys(currentOverride).length > 0;

  const handleSave = () => {
    // Only save fields that differ from original
    const override: ChecklistItemOverride = {};
    
    if (formData.topic !== (item.topic ?? '')) {
      override.topic = formData.topic;
    }
    if (formData.description !== item.description) {
      override.description = formData.description;
    }
    if (formData.supporting_evidence !== (item.supporting_evidence ?? '')) {
      override.supporting_evidence = formData.supporting_evidence;
    }
    if (formData.approvers !== (item.approvers ?? '')) {
      override.approvers = formData.approvers;
    }
    if (formData.responsible !== (item.responsible ?? '')) {
      override.responsible = formData.responsible;
    }

    onSave(item.id, override);
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset(item.id);
    // Reset form to original values
    setFormData({
      topic: item.topic ?? '',
      description: item.description ?? '',
      supporting_evidence: item.supporting_evidence ?? '',
      approvers: item.approvers ?? '',
      responsible: item.responsible ?? '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-primary" />
            Edit Checklist Item (Local Override)
          </DialogTitle>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline" className="text-xs">
              Item #{item.sequence_number}
            </Badge>
            {hasOverrides && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Has Custom Overrides
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground pt-1">
            Changes made here only apply to this PSSR reason and won't affect the original checklist item library.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={formData.topic || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="Enter topic..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supporting_evidence">Supporting Evidence</Label>
            <Textarea
              id="supporting_evidence"
              value={formData.supporting_evidence || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, supporting_evidence: e.target.value }))}
              placeholder="Enter supporting evidence requirements..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="approvers">Approvers</Label>
              <Input
                id="approvers"
                value={formData.approvers || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, approvers: e.target.value }))}
                placeholder="e.g., PSSR Team Lead"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsible">Responsible</Label>
              <Input
                id="responsible"
                value={formData.responsible || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, responsible: e.target.value }))}
                placeholder="e.g., Project Manager"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!hasOverrides}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Original
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistItemEditDialog;
