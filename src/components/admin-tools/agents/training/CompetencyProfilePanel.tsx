import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight, Plus, Search, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLevelFromProgress, isNewCompetency } from './competencyLevels';
import CompetencyDonut from './CompetencyDonut';
import type { CompetencyArea } from '@/hooks/useAgentCompetencies';

interface CompetencyProfilePanelProps {
  competencies: CompetencyArea[];
  overallProgress: number;
  isLoading: boolean;
  onSelectCompetency: (competency: CompetencyArea) => void;
  onAddCompetency: () => void;
  agentName?: string;
  onOpenCompetenceChat?: () => void;
  hasCompletedSessions?: boolean;
  onSyncCompetencies?: () => Promise<void>;
}

const CompetencyProfilePanel: React.FC<CompetencyProfilePanelProps> = ({
  competencies,
  overallProgress,
  isLoading,
  onSelectCompetency,
  onAddCompetency,
  agentName,
  onOpenCompetenceChat,
  hasCompletedSessions,
  onSyncCompetencies,
}) => {
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [levelFilter, setLevelFilter] = React.useState<string>('all');

  const filtered = competencies.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'all' || c.status === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Summary header */}
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <CompetencyDonut progress={overallProgress} size={80} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{overallProgress}% Overall Competence</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {competencies.length} competency area{competencies.length !== 1 ? 's' : ''} tracked
            </p>
          </div>
        </div>
        {/* Sync button when all competencies are 0% but sessions exist */}
        {overallProgress === 0 && competencies.length > 0 && hasCompletedSessions && onSyncCompetencies && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs gap-1.5 mt-2 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
            disabled={isSyncing}
            onClick={async () => {
              setIsSyncing(true);
              try { await onSyncCompetencies(); } finally { setIsSyncing(false); }
            }}
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {isSyncing ? 'Syncing...' : 'Sync from training history'}
          </Button>
        )}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2 p-3 border-b border-border/30">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search areas..."
            className="h-8 text-xs pl-8"
          />
        </div>
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground"
        >
          <option value="all">All levels</option>
          <option value="not_started">Not Started</option>
          <option value="foundational">Foundational</option>
          <option value="developing">Developing</option>
          <option value="proficient">Proficient</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      {/* Competency list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {search || levelFilter !== 'all' ? 'No matching areas' : 'No competency areas yet'}
          </div>
        ) : (
          filtered.map(comp => {
            const level = getLevelFromProgress(comp.progress);
            const isNew = isNewCompetency(comp.created_at);
            return (
              <button
                key={comp.id}
                onClick={() => onSelectCompetency(comp)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 hover:shadow-md transition-all duration-150 border-l-2 border-transparent hover:border-primary/30 border-b border-b-border/20 group text-left"
              >
                <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', level.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground truncate">{comp.name}</span>
                    {isNew && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
                        New
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', level.color)}
                      style={{ width: `${comp.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-7 text-right">{comp.progress}%</span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border/40 font-normal hidden sm:inline-flex">
                    {level.label}
                  </Badge>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-border/40 space-y-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onAddCompetency}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Competency Area
        </Button>
        {onOpenCompetenceChat && (
          <>
            <div className="border-t border-border/30" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-9 text-xs gap-2 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 justify-start"
              onClick={onOpenCompetenceChat}
            >
              <MessageSquare className="h-4 w-4" />
              Discuss competencies with {agentName || 'agent'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CompetencyProfilePanel;
