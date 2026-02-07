import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Check, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddVCRModal } from './AddVCRModal';

// Subtle pastel hues for VCR ID badges (avoids red/amber/green status colors)
const VCR_ID_HUES = [210, 260, 180, 320, 195, 280, 170, 300]; // blue, purple, teal, magenta, cyan, violet, sea, pink

const getVCRIdStyle = (index: number) => {
  const hue = VCR_ID_HUES[index % VCR_ID_HUES.length];
  return {
    backgroundColor: `hsl(${hue}, 40%, 94%)`,
    color: `hsl(${hue}, 50%, 35%)`,
    borderColor: `hsl(${hue}, 35%, 88%)`,
  };
};

export interface WizardVCR {
  id: string;
  name: string;
  reason: string;
  targetMilestone: string;
  code?: string;
}

interface VCRCreationStepProps {
  vcrs: WizardVCR[];
  milestones: Array<{ id: string; name: string }>;
  projectCode: string;
  onVCRsChange: (vcrs: WizardVCR[]) => void;
}

export const VCRCreationStep: React.FC<VCRCreationStepProps> = ({
  vcrs,
  milestones,
  projectCode,
  onVCRsChange,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const generateVCRCode = (index: number) => {
    const cleanCode = projectCode.replace(/-/g, '');
    return `VCR-${cleanCode}-${String(index + 1).padStart(3, '0')}`;
  };

  const handleAddVCR = (vcr: WizardVCR) => {
    onVCRsChange([...vcrs, vcr]);
  };

  const handleRemoveVCR = (id: string) => {
    const updated = vcrs.filter(v => v.id !== id);
    onVCRsChange(updated.map((v, i) => ({ ...v, code: generateVCRCode(i) })));
  };

  const handleUpdateVCR = (id: string, updates: Partial<WizardVCR>) => {
    onVCRsChange(vcrs.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  // Always regenerate codes to ensure consistent format
  const vcrsByCode = vcrs.map((v, i) => ({ ...v, code: generateVCRCode(i) }));

  const getMilestoneName = (id: string) => {
    return milestones.find(m => m.id === id)?.name || '';
  };

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Verification Checkpoints (VCRs)</h3>
          <p className="text-xs text-muted-foreground">
            Define VCRs with their target milestones
          </p>
        </div>
        <Badge variant="outline">{vcrs.length} VCRs</Badge>
      </div>

      {/* Add VCR Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="group w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-gradient-to-br from-muted/50 to-muted/30 hover:border-primary/50 hover:from-primary/10 hover:to-primary/5 transition-all duration-200"
      >
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Plus className="h-4 w-4" />
        </div>
        <div className="text-left">
          <p className="font-medium text-sm">Add VCR</p>
          <p className="text-[10px] text-muted-foreground">Create a new verification checkpoint</p>
        </div>
      </button>

      {/* VCR List */}
      <div className="border rounded-lg flex-1 min-h-0 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {vcrs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No VCRs created yet</p>
                <p className="text-xs mt-0.5">Add a VCR above to get started</p>
              </div>
            ) : (
              vcrsByCode.map((vcr, index) => (
                <div
                  key={vcr.id}
                  className={cn(
                    "group p-3 rounded-lg border bg-card transition-all hover:bg-muted/40 hover:border-primary/20",
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
                      <div className="flex items-center gap-2">
                        <Select
                          value={vcr.targetMilestone}
                          onValueChange={(value) => handleUpdateVCR(vcr.id, { targetMilestone: value })}
                        >
                          <SelectTrigger className="h-8 text-sm flex-1">
                            <SelectValue placeholder="Target Milestone" />
                          </SelectTrigger>
                          <SelectContent>
                            {milestones.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{vcr.name}</span>
                          <span
                            className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border"
                            style={getVCRIdStyle(index)}
                          >
                            {vcr.code}
                          </span>
                        </div>
                        {vcr.reason && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {vcr.reason}
                          </p>
                        )}
                        {vcr.targetMilestone && (
                          <Badge variant="secondary" className="mt-2 text-[10px]">
                            Target: {getMilestoneName(vcr.targetMilestone)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingId(vcr.id)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleRemoveVCR(vcr.id)}
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
    </div>
  );
};
