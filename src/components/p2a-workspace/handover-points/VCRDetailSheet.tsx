import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint, useHandoverPointSystems } from '../hooks/useP2AHandoverPoints';
import { DeleteVCRDialog } from './DeleteVCRDialog';

interface P2APhase {
  id: string;
  name: string;
}

interface P2ASystem {
  id: string;
  name: string;
  system_id?: string;
  is_hydrocarbon?: boolean;
  subsystems?: Array<{
    id: string;
    name: string;
    system_id?: string;
  }>;
}

interface VCRDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handoverPoint: P2AHandoverPoint;
  phases: P2APhase[];
  allSystems: P2ASystem[];
  onMoveToPhase?: (vcrId: string, phaseId: string | null) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  onAssignSystem?: (pointId: string, systemId: string) => void;
  onUnassignSystem?: (pointId: string, systemId: string) => void;
}

export const VCRDetailSheet: React.FC<VCRDetailSheetProps> = ({
  open,
  onOpenChange,
  handoverPoint,
  phases,
  allSystems,
  onMoveToPhase,
  onDelete,
  isDeleting,
  onAssignSystem,
  onUnassignSystem,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { systems: assignedSystems, isLoading: systemsLoading } = useHandoverPointSystems(handoverPoint.id);

  const assignedSystemIds = new Set((assignedSystems || []).map((s: any) => s.id));

  const currentPhaseId = handoverPoint.phase_id || '';

  const handlePhaseChange = (phaseId: string) => {
    onMoveToPhase?.(handoverPoint.id, phaseId === 'none' ? null : phaseId);
  };

  const handleToggleSystem = (systemId: string) => {
    if (assignedSystemIds.has(systemId)) {
      onUnassignSystem?.(handoverPoint.id, systemId);
    } else {
      onAssignSystem?.(handoverPoint.id, systemId);
    }
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete();
      setShowDeleteDialog(false);
      onOpenChange(false);
    }
  };

  // Partition systems into assigned and available
  const assigned = allSystems.filter(s => assignedSystemIds.has(s.id));
  const available = allSystems.filter(s => !assignedSystemIds.has(s.id));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md p-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border text-muted-foreground"
              >
                {handoverPoint.vcr_code}
              </span>
              <div className="flex items-center gap-1">
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeleteDialog(true)}
                    title="Delete VCR"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <SheetTitle className="text-lg font-semibold mt-1">
              {handoverPoint.name}
            </SheetTitle>
          </SheetHeader>

          {/* Phase assignment */}
          <div className="px-4 py-3 border-b shrink-0 space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phase</Label>
            <Select value={currentPhaseId || 'none'} onValueChange={handlePhaseChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {phases.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Systems */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="px-4 py-2 flex items-center justify-between shrink-0">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Systems
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {assignedSystemIds.size} mapped
              </Badge>
            </div>

            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="space-y-0.5">
                {assigned.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-medium text-primary uppercase tracking-wider px-3 pb-1">
                      Assigned ({assigned.length})
                    </p>
                    {assigned.map(s => (
                      <SystemRow
                        key={s.id}
                        system={s}
                        isAssigned={true}
                        onToggle={() => handleToggleSystem(s.id)}
                      />
                    ))}
                  </div>
                )}
                {available.length > 0 && (
                  <div>
                    {assigned.length > 0 && <div className="border-t my-2" />}
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 pb-1">
                      Available ({available.length})
                    </p>
                    {available.map(s => (
                      <SystemRow
                        key={s.id}
                        system={s}
                        isAssigned={false}
                        onToggle={() => handleToggleSystem(s.id)}
                      />
                    ))}
                  </div>
                )}
                {assigned.length === 0 && available.length === 0 && !systemsLoading && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No systems available
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <DeleteVCRDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        vcr={handoverPoint}
        systemsCount={assignedSystemIds.size}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  );
};

// Simple system row with checkbox
const SystemRow: React.FC<{
  system: P2ASystem;
  isAssigned: boolean;
  onToggle: () => void;
}> = ({ system, isAssigned, onToggle }) => (
  <div
    className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-md transition-colors cursor-pointer hover:bg-muted/50',
      isAssigned && 'bg-primary/5',
    )}
    onClick={onToggle}
  >
    <Checkbox checked={isAssigned} className="h-3.5 w-3.5" />
    <span className="text-sm flex-1 truncate">{system.name}</span>
    {system.is_hydrocarbon && (
      <Badge variant="outline" className="text-[9px] font-semibold px-1 py-0.5 border-orange-200 bg-orange-100 text-orange-700">HC</Badge>
    )}
  </div>
);
