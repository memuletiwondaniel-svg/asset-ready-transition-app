import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Milestone,
  Key,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardPhase } from '../PhasesStep';
import { WizardVCR } from '../VCRCreationStep';

// Subtle pastel hues for VCR ID badges
const VCR_ID_HUES = [210, 260, 180, 320, 195, 280, 170, 300];

const getVCRIdStyle = (index: number) => {
  const hue = VCR_ID_HUES[index % VCR_ID_HUES.length];
  return {
    backgroundColor: `hsl(${hue}, 40%, 94%)`,
    color: `hsl(${hue}, 50%, 35%)`,
    borderColor: `hsl(${hue}, 35%, 88%)`,
  };
};

interface PhaseCardProps {
  phase: WizardPhase;
  index: number;
  total: number;
  milestones: Array<{ id: string; name: string; target_date?: string }>;
  assignedVCRs: WizardVCR[];
  allVCRs: WizardVCR[];
  onEdit: (phase: WizardPhase) => void;
  onDelete: (id: string) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onUnassignVCR: (vcrId: string) => void;
}

const PHASE_COLORS = [
  { bg: 'bg-slate-100 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700', accent: 'text-slate-600 dark:text-slate-400' },
  { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800', accent: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', accent: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800', accent: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800', accent: 'text-purple-600 dark:text-purple-400' },
  { bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-800', accent: 'text-rose-600 dark:text-rose-400' },
];

export { PHASE_COLORS };

export const PhaseCard: React.FC<PhaseCardProps> = ({
  phase,
  index,
  total,
  milestones,
  assignedVCRs,
  allVCRs,
  onEdit,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onUnassignVCR,
}) => {
  const colors = PHASE_COLORS[index % PHASE_COLORS.length];
  const linkedMilestones = milestones.filter(m => phase.milestoneIds.includes(m.id));

  const { isOver, setNodeRef } = useDroppable({ id: `phase-${phase.id}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group relative flex flex-col rounded-lg border-2 transition-all min-w-[180px] w-[200px] overflow-visible',
        colors.border,
        colors.bg,
        isOver && 'ring-2 ring-primary ring-offset-1 scale-[1.02]',
      )}
    >
      {/* Phase number badge */}
      <div className={cn('absolute -top-2.5 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold', colors.bg, colors.border, 'border')}>
        <span className={colors.accent}>Phase {index + 1}</span>
      </div>

      {/* Reorder arrows */}
      <div className="absolute -top-2.5 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="icon"
          className="h-5 w-5 rounded-full bg-background"
          onClick={onMoveLeft}
          disabled={index === 0}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-5 w-5 rounded-full bg-background"
          onClick={onMoveRight}
          disabled={index === total - 1}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Card content */}
      <div className="p-3 pt-4 flex flex-col gap-2 flex-1">
        {/* Title */}
        <h4 className="text-sm font-semibold leading-tight line-clamp-2">{phase.name}</h4>

        {/* Description */}
        {phase.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {phase.description}
          </p>
        )}

        {/* Milestones */}
        {linkedMilestones.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {linkedMilestones.map(m => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 text-[9px] text-muted-foreground bg-background/60 border px-1.5 py-0.5 rounded"
              >
                <Milestone className="h-2.5 w-2.5" />
                {m.name}
              </span>
            ))}
          </div>
        )}

        {/* Assigned VCRs */}
        <div className="mt-1 space-y-1 min-h-[40px]">
          {assignedVCRs.length > 0 ? (
            assignedVCRs.map((vcr) => {
              const vcrIndex = allVCRs.findIndex(v => v.id === vcr.id);
              return (
                <div
                  key={vcr.id}
                  className="group/vcr flex items-center gap-1.5 p-1.5 rounded-md bg-background/80 border text-[11px] transition-colors hover:bg-background"
                >
                  <Key className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate flex-1 font-medium">{vcr.name}</span>
                  <span
                    className="text-[9px] font-mono px-1 py-0.5 rounded border shrink-0"
                    style={getVCRIdStyle(vcrIndex >= 0 ? vcrIndex : 0)}
                  >
                    {vcr.code}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onUnassignVCR(vcr.id); }}
                    className="opacity-0 group-hover/vcr:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                    title="Unassign VCR"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className={cn(
              'flex items-center justify-center py-3 rounded-md border-2 border-dashed text-[10px] text-muted-foreground transition-colors',
              isOver ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/20'
            )}>
              Drop VCRs here
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
          <Badge variant="secondary" className="text-[10px] font-normal">
            {assignedVCRs.length} VCR{assignedVCRs.length !== 1 ? 's' : ''}
          </Badge>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(phase)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => onDelete(phase.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
