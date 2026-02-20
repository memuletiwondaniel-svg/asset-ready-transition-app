import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw, Save } from 'lucide-react';
import { ChecklistItem } from '@/hooks/usePSSRChecklistLibrary';
import { ChecklistItemOverride } from './ChecklistItemEditDialog';

interface PSSRItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ChecklistItem | null;
  categoryRefId?: string;
  currentOverride?: ChecklistItemOverride;
  onSave: (itemId: string, override: ChecklistItemOverride) => void;
  onReset: (itemId: string) => void;
}

const PSSRItemDetailSheet: React.FC<PSSRItemDetailSheetProps> = ({
  open,
  onOpenChange,
  item,
  categoryRefId,
  currentOverride,
  onSave,
  onReset,
}) => {
  const [formData, setFormData] = useState<ChecklistItemOverride>({});

  useEffect(() => {
    if (item && open) {
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

  const itemId = categoryRefId
    ? `${categoryRefId}-${String(item.sequence_number).padStart(2, '0')}`
    : `#${item.sequence_number}`;

  const handleSave = () => {
    const override: ChecklistItemOverride = {};
    if (formData.topic !== (item.topic ?? '')) override.topic = formData.topic;
    if (formData.description !== item.description) override.description = formData.description;
    if (formData.supporting_evidence !== (item.supporting_evidence ?? '')) override.supporting_evidence = formData.supporting_evidence;
    if (formData.approvers !== (item.approvers ?? '')) override.approvers = formData.approvers;
    if (formData.responsible !== (item.responsible ?? '')) override.responsible = formData.responsible;
    onSave(item.id, override);
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset(item.id);
    setFormData({
      topic: item.topic ?? '',
      description: item.description ?? '',
      supporting_evidence: item.supporting_evidence ?? '',
      approvers: item.approvers ?? '',
      responsible: item.responsible ?? '',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base">Edit PSSR Item</SheetTitle>
            <Badge variant="outline" className="text-xs font-mono bg-primary/5 text-primary border-primary/20">
              {itemId}
            </Badge>
            {hasOverrides && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Customized
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Changes only apply to this PSSR instance.
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-5">
            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                PSSR Item Description *
              </Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description..."
                rows={4}
                className="text-sm"
              />
            </div>

            {/* Topic */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Topic
              </Label>
              <Input
                value={formData.topic || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="Enter topic..."
                className="text-sm"
              />
            </div>

            {/* Delivering Party */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Delivering Party
              </Label>
              <Input
                value={formData.responsible || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, responsible: e.target.value }))}
                placeholder="e.g., Project Engr"
                className="text-sm"
              />
            </div>

            {/* Approving Parties */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Approving Parties
              </Label>
              <Input
                value={formData.approvers || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, approvers: e.target.value }))}
                placeholder="e.g., Process TA2, PACO TA2"
                className="text-sm"
              />
            </div>

            {/* Guidance Notes / Supporting Evidence */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Guidance Notes
              </Label>
              <Textarea
                value={formData.supporting_evidence || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, supporting_evidence: e.target.value }))}
                placeholder="Enter guidance notes or supporting evidence requirements..."
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!hasOverrides}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs">
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PSSRItemDetailSheet;
