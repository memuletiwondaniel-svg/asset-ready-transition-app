import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowRight, GitMerge, Link2 } from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';

type RelationshipType = 'PREREQUISITE' | 'DEPENDENT' | 'COMBINE';

interface VCRRelationshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceVCR: P2AHandoverPoint;
  targetVCR: P2AHandoverPoint;
  onCreateRelationship: (data: {
    sourceVcrId: string;
    targetVcrId: string;
    relationshipType: 'PREREQUISITE' | 'DEPENDENT';
  }) => void;
  onCombineVCRs: (data: {
    sourceVcrId: string;
    targetVcrId: string;
    newName: string;
  }) => void;
  isCreating?: boolean;
  isCombining?: boolean;
}

export const VCRRelationshipDialog: React.FC<VCRRelationshipDialogProps> = ({
  open,
  onOpenChange,
  sourceVCR,
  targetVCR,
  onCreateRelationship,
  onCombineVCRs,
  isCreating,
  isCombining,
}) => {
  const [selectedType, setSelectedType] = useState<RelationshipType>('PREREQUISITE');
  const [step, setStep] = useState<'select' | 'combine-name'>('select');
  const [combinedName, setCombinedName] = useState('');

  // Extract short VCR codes for display (e.g., VCR-001 from VCR-001-DP300)
  const sourceCode = sourceVCR.vcr_code;
  const targetCode = targetVCR.vcr_code;

  const handleConfirm = () => {
    if (selectedType === 'COMBINE') {
      setStep('combine-name');
      setCombinedName(`${sourceVCR.name} + ${targetVCR.name}`);
    } else {
      onCreateRelationship({
        sourceVcrId: sourceVCR.id,
        targetVcrId: targetVCR.id,
        relationshipType: selectedType,
      });
      onOpenChange(false);
      resetState();
    }
  };

  const handleCreateCombined = () => {
    if (!combinedName.trim()) return;
    onCombineVCRs({
      sourceVcrId: sourceVCR.id,
      targetVcrId: targetVCR.id,
      newName: combinedName.trim(),
    });
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setSelectedType('PREREQUISITE');
    setStep('select');
    setCombinedName('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>VCR Relationship</DialogTitle>
              <DialogDescription>
                Define how these two VCRs are related
              </DialogDescription>
            </DialogHeader>

            {/* VCR Preview Cards */}
            <div className="flex items-center justify-between gap-3 py-4">
              <div className="flex-1 rounded-lg bg-muted p-3 text-center">
                <code className="text-xs font-mono text-muted-foreground">{sourceCode}</code>
                <p className="mt-1 text-sm font-medium truncate" title={sourceVCR.name}>
                  {sourceVCR.name}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 rounded-lg bg-muted p-3 text-center">
                <code className="text-xs font-mono text-muted-foreground">{targetCode}</code>
                <p className="mt-1 text-sm font-medium truncate" title={targetVCR.name}>
                  {targetVCR.name}
                </p>
              </div>
            </div>

            {/* Relationship Type Selection */}
            <RadioGroup
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as RelationshipType)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="PREREQUISITE" id="prerequisite" className="mt-0.5" />
                <Label htmlFor="prerequisite" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Prerequisite</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    <code className="text-xs">{sourceCode}</code> must be completed before{' '}
                    <code className="text-xs">{targetCode}</code>
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="DEPENDENT" id="dependent" className="mt-0.5" />
                <Label htmlFor="dependent" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-amber-500 rotate-180" />
                    <span className="font-medium">Dependent</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    <code className="text-xs">{targetCode}</code> can only be completed when{' '}
                    <code className="text-xs">{sourceCode}</code> is done
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="COMBINE" id="combine" className="mt-0.5" />
                <Label htmlFor="combine" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <GitMerge className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Combine</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Merge both VCRs into a single new VCR
                  </p>
                </Label>
              </div>
            </RadioGroup>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Name Combined VCR</DialogTitle>
              <DialogDescription>
                Enter a name for the new combined VCR. A new ID will be auto-generated.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="combined-name">New VCR Name</Label>
                <Input
                  id="combined-name"
                  value={combinedName}
                  onChange={(e) => setCombinedName(e.target.value)}
                  placeholder="Enter combined VCR name"
                  autoFocus
                />
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium">Note:</span> All systems, prerequisites, documents,
                  training items, and procedures from both VCRs will be migrated to the new VCR.
                  The original VCRs will be deleted.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button
                onClick={handleCreateCombined}
                disabled={!combinedName.trim() || isCombining}
              >
                {isCombining ? 'Creating...' : 'Create Combined VCR'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
