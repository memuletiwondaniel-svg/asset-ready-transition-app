import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Check, X, Key } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newVCR, setNewVCR] = useState<Partial<WizardVCR>>({
    name: '',
    reason: '',
    targetMilestone: '',
  });

  const generateVCRCode = (index: number) => {
    return `VCR-${String(index + 1).padStart(3, '0')}-${projectCode}`;
  };

  const handleAddVCR = () => {
    if (!newVCR.name?.trim()) return;

    const vcr: WizardVCR = {
      id: `temp-${Date.now()}`,
      name: newVCR.name.trim(),
      reason: newVCR.reason?.trim() || '',
      targetMilestone: newVCR.targetMilestone || '',
      code: generateVCRCode(vcrs.length),
    };

    onVCRsChange([...vcrs, vcr]);
    setNewVCR({ name: '', reason: '', targetMilestone: '' });
    setShowAddForm(false);
  };

  const handleRemoveVCR = (id: string) => {
    const updated = vcrs.filter(v => v.id !== id);
    // Regenerate codes
    onVCRsChange(updated.map((v, i) => ({ ...v, code: generateVCRCode(i) })));
  };

  const handleUpdateVCR = (id: string, updates: Partial<WizardVCR>) => {
    onVCRsChange(vcrs.map(v => v.id === id ? { ...v, ...updates } : v));
    setEditingId(null);
  };

  const getMilestoneName = (id: string) => {
    return milestones.find(m => m.id === id)?.name || '';
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Verification Checkpoints (VCRs)</h3>
          <p className="text-xs text-muted-foreground">
            Define VCRs with their target milestones
          </p>
        </div>
        <Badge variant="outline">{vcrs.length} VCRs</Badge>
      </div>

      {/* VCR List */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[280px]">
          <div className="p-2 space-y-2">
            {vcrs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Key className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No VCRs created yet</p>
                <p className="text-xs mt-1">VCRs define verification points for handover</p>
              </div>
            ) : (
              vcrs.map((vcr) => (
                <div
                  key={vcr.id}
                  className={cn(
                    "p-3 rounded-lg border bg-card transition-colors",
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
                        placeholder="Reason for VCR..."
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
                      <Key className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{vcr.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
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
                      <div className="flex gap-1 shrink-0">
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

      {/* Add Form */}
      {showAddForm ? (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <div>
            <Label className="text-xs">VCR Name *</Label>
            <Input
              value={newVCR.name || ''}
              onChange={(e) => setNewVCR(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Power and Utilities Handover"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Reason / Description</Label>
            <Textarea
              value={newVCR.reason || ''}
              onChange={(e) => setNewVCR(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Why is this VCR needed? What systems does it cover?"
              rows={2}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Target Milestone</Label>
            <Select
              value={newVCR.targetMilestone || ''}
              onValueChange={(value) => setNewVCR(prev => ({ ...prev, targetMilestone: value }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select milestone..." />
              </SelectTrigger>
              <SelectContent>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              Code: <span className="font-mono">{generateVCRCode(vcrs.length)}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleAddVCR}
                disabled={!newVCR.name?.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add VCR
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add VCR
        </Button>
      )}
    </div>
  );
};
