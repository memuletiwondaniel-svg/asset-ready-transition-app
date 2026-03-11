import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  ArrowLeftRight, 
  Plus, 
  Layers, 
  GitBranch, 
  Target,
  Sparkles
} from 'lucide-react';

interface EmptyWorkspaceStateProps {
  onCreatePlan: (data: { name: string; description?: string; project_code?: string; plant_code?: string }) => void;
  isCreating: boolean;
  projectName?: string;
  projectNumber?: string;
}

export const EmptyWorkspaceState: React.FC<EmptyWorkspaceStateProps> = ({
  onCreatePlan,
  isCreating,
  projectName,
  projectNumber,
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [plantCode, setPlantCode] = useState('');

  const handleCreate = () => {
    onCreatePlan({
      name: `${projectNumber} P2A Plan`,
      project_code: projectNumber || '',
      plant_code: plantCode,
    });
    setShowCreateDialog(false);
  };

  return (
    <>
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-2xl w-full border-dashed border-2 bg-gradient-to-br from-background to-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-16 px-8">
            {/* Animated Icon */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <ArrowLeftRight className="w-12 h-12 text-cyan-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
              Develop P2A Plan
            </h2>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              Set up your Project-to-Asset handover workspace to manage systems, 
              define project phases, and track Verification of Readiness (VCR) checkpoints.
            </p>

            {/* Features Preview */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-lg mb-8">
              <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
                  <Layers className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-xs font-medium text-center">Systems Registry</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                  <GitBranch className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-xs font-medium text-center">Project Phases</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
                  <Target className="w-5 h-5 text-amber-500" />
                </div>
                <span className="text-xs font-medium text-center">VCR Checkpoints</span>
              </div>
            </div>

            <Button 
              size="lg" 
              onClick={() => setShowCreateDialog(true)}
              className="gap-2 px-8"
            >
              <Plus className="w-5 h-5" />
              Develop P2A Plan
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Create Plan Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Develop P2A Plan</DialogTitle>
            <DialogDescription>
              Set up your handover workspace with project identifiers
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {projectNumber && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Plan Name</div>
                <div className="font-medium">{projectNumber} P2A Plan</div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="plant-code">Plant Code</Label>
              <Input
                id="plant-code"
                value={plantCode}
                onChange={(e) => setPlantCode(e.target.value)}
                placeholder="e.g., N003"
              />
              <p className="text-xs text-muted-foreground">Used in System IDs (e.g., N003-{projectNumber || 'XXX'}-100)</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
