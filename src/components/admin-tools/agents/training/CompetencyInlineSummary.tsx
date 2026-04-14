import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CompetencyDonut from './CompetencyDonut';
import { getLevelFromProgress } from './competencyLevels';
import type { CompetencyArea } from '@/hooks/useAgentCompetencies';

interface CompetencyInlineSummaryProps {
  competencies: CompetencyArea[];
  overallProgress: number;
  sessionsCount: number;
  lastSessionDate: string;
  isLoading: boolean;
  onOpenWorkspace: () => void;
}

const CompetencyInlineSummary: React.FC<CompetencyInlineSummaryProps> = ({
  competencies,
  overallProgress,
  sessionsCount,
  lastSessionDate,
  isLoading,
  onOpenWorkspace,
}) => {
  if (isLoading) {
    return (
      <div className="px-5 py-4 flex items-center justify-center">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Top 5 lowest-progress areas
  const gaps = [...competencies]
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 5);

  return (
    <div className="px-5 py-4 space-y-3">
      {/* Summary row */}
      <div className="flex items-center gap-4">
        <CompetencyDonut progress={overallProgress} size={72} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {overallProgress}% Overall · {competencies.length} areas · {sessionsCount} session{sessionsCount !== 1 ? 's' : ''}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            {lastSessionDate ? `Last trained: ${lastSessionDate}` : 'No training sessions yet'}
          </p>
        </div>
        <Button
          onClick={onOpenWorkspace}
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0"
        >
          Open Training Workspace →
        </Button>
      </div>

      {/* Top 5 gaps */}
      {gaps.length > 0 && (
        <div className="space-y-1.5">
          {gaps.map(gap => {
            const level = getLevelFromProgress(gap.progress);
            return (
              <div key={gap.id} className="flex items-center gap-2.5">
                <div className={cn('h-2 w-2 rounded-full shrink-0', level.color)} />
                <span className="text-xs text-muted-foreground truncate flex-1">{gap.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-28 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', level.color)}
                      style={{ width: `${gap.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-7 text-right">{gap.progress}%</span>
                </div>
              </div>
            );
          })}
          {competencies.length > 5 && (
            <button
              onClick={onOpenWorkspace}
              className="text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              +{competencies.length - 5} more areas
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CompetencyInlineSummary;
