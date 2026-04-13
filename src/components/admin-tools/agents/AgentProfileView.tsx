import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Users, ChevronDown, BookOpen, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { AgentProfile } from '@/data/agentProfiles';
import { agentProfiles } from '@/data/agentProfiles';
import AgentTrainingStudio from './AgentTrainingStudio';
import AgentMonitorCard from './AgentMonitorCard';
import CompetencyInlineSummary from './training/CompetencyInlineSummary';
import CompetencyDrawer from './training/CompetencyDrawer';
import { useAgentCompetencies } from '@/hooks/useAgentCompetencies';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AgentProfileViewProps {
  agent: AgentProfile;
  onAgentClick: (code: string) => void;
}

type SectionColor = 'blue' | 'amber' | 'emerald';

const SPEC_VISIBLE = 6;
const LIMIT_VISIBLE = 4;

const sectionColorMap: Record<SectionColor, { bg: string; icon: string }> = {
  blue:    { bg: 'bg-blue-500/10 group-hover:bg-blue-500/15',       icon: 'text-blue-600 dark:text-blue-400' },
  amber:   { bg: 'bg-amber-500/10 group-hover:bg-amber-500/15',     icon: 'text-amber-600 dark:text-amber-400' },
  emerald: { bg: 'bg-emerald-500/10 group-hover:bg-emerald-500/15', icon: 'text-emerald-600 dark:text-emerald-400' },
};

const SectionHeader: React.FC<{
  label: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  count?: number;
  color?: SectionColor;
}> = ({ label, icon: Icon, isOpen, onToggle, count, color = 'blue' }) => {
  const c = sectionColorMap[color];
  return (
  <button
    onClick={onToggle}
    className="group flex items-center gap-3 w-full py-3 cursor-pointer select-none"
  >
    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors", c.bg)}>
      <Icon className={cn("h-3.5 w-3.5", c.icon)} />
    </div>
    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 group-hover:text-foreground transition-colors">
      {label}
    </span>
    {count !== undefined && (
      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 ml-1">
        {count}
      </Badge>
    )}
    <div className="flex-1 border-t border-border/40 mx-2" />
    <ChevronDown
      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
    />
  </button>
  );
};

const AgentProfileView: React.FC<AgentProfileViewProps> = ({ agent, onAgentClick }) => {
  const [aboutOpen, setAboutOpen] = React.useState(true);
  const [trainingOpen, setTrainingOpen] = React.useState(true);
  const [performanceOpen, setPerformanceOpen] = React.useState(true);
  const [bioExpanded, setBioExpanded] = React.useState(false);
  const [showAllSpecs, setShowAllSpecs] = React.useState(false);
  const [showAllLimits, setShowAllLimits] = React.useState(false);

  // Competency + Drawer state
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = React.useState(false);

  const { competencies, isLoading: compLoading, overallProgress } = useAgentCompetencies(agent.code, agent);

  // Sessions query (shared between drawer and studio)
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['agent-training-sessions', agent.code],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('agent_training_sessions')
        .select('*')
        .eq('agent_code', agent.code)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const completedSessions = sessions.filter((s: any) => s.status === 'completed');
  const lastSessionDate = completedSessions.length > 0
    ? format(new Date(completedSessions[0].completed_at || completedSessions[0].created_at), 'dd MMM yyyy')
    : '';

  const collaborators = agent.worksWith
    .map(code => agentProfiles.find(a => a.code === code))
    .filter(Boolean) as AgentProfile[];

  const visibleSpecs = showAllSpecs ? agent.specializations : agent.specializations.slice(0, SPEC_VISIBLE);
  const hiddenSpecCount = agent.specializations.length - SPEC_VISIBLE;

  const visibleLimits = showAllLimits ? agent.limitations : agent.limitations.slice(0, LIMIT_VISIBLE);
  const hiddenLimitCount = agent.limitations.length - LIMIT_VISIBLE;

  const handleRetrain = (session: any) => {
    setTrainingDialogOpen(true);
  };

  const handleTest = (session: any) => {
    setTrainingDialogOpen(true);
  };

  return (
    <div className="space-y-2 animate-fade-in">
      {/* ─── ABOUT [AGENT] ─── */}
      <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
        <CollapsibleTrigger asChild>
          <div>
            <SectionHeader
              label={`About ${agent.name}`}
              icon={Users}
              isOpen={aboutOpen}
              onToggle={() => setAboutOpen(o => !o)}
              color="blue"
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="border-border/40 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <p className={cn(
                "text-sm text-muted-foreground/80 leading-relaxed",
                !bioExpanded && "line-clamp-3"
              )}>
                {agent.introduction}
              </p>
              <button
                onClick={() => setBioExpanded(e => !e)}
                className="text-[10px] text-muted-foreground/60 hover:text-foreground mt-1 transition-colors duration-150"
              >
                {bioExpanded ? "Show less" : "Show more"}
              </button>

              {collaborators.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap mt-3 mb-3 pb-3 border-b border-border/30">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
                    <Users className="h-3.5 w-3.5" />
                    Works with
                  </div>
                  {collaborators.map((collab) => (
                    <button
                      key={collab.code}
                      className="flex items-center gap-2 bg-background hover:bg-accent rounded-lg px-2.5 py-1.5 cursor-pointer transition-all duration-200 border border-border/40 group hover:scale-[1.02] hover:shadow-sm"
                      onClick={() => onAgentClick(collab.code)}
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-border/30">
                        <img src={collab.avatar} alt={collab.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{collab.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Specializations</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {visibleSpecs.map((spec) => (
                      <Badge
                        key={spec}
                        variant="secondary"
                        className="text-[10px] py-0.5 px-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-normal"
                      >
                        {spec}
                      </Badge>
                    ))}
                  </div>
                  {!showAllSpecs && hiddenSpecCount > 0 && (
                    <button
                      onClick={() => setShowAllSpecs(true)}
                      className="text-[10px] text-muted-foreground/60 hover:text-foreground mt-1 transition-colors duration-150"
                    >
                      +{hiddenSpecCount} more
                    </button>
                  )}
                  {showAllSpecs && hiddenSpecCount > 0 && (
                    <button
                      onClick={() => setShowAllSpecs(false)}
                      className="text-[10px] text-muted-foreground/60 hover:text-foreground mt-1 transition-colors duration-150"
                    >
                      Show less
                    </button>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Limitations</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {visibleLimits.map((lim) => (
                      <Badge
                        key={lim}
                        variant="outline"
                        className="text-[10px] py-0.5 px-2 text-muted-foreground border-border/60 font-normal"
                      >
                        {lim}
                      </Badge>
                    ))}
                  </div>
                  {!showAllLimits && hiddenLimitCount > 0 && (
                    <button
                      onClick={() => setShowAllLimits(true)}
                      className="text-[10px] text-muted-foreground/60 hover:text-foreground mt-1 transition-colors duration-150"
                    >
                      +{hiddenLimitCount} more
                    </button>
                  )}
                  {showAllLimits && hiddenLimitCount > 0 && (
                    <button
                      onClick={() => setShowAllLimits(false)}
                      className="text-[10px] text-muted-foreground/60 hover:text-foreground mt-1 transition-colors duration-150"
                    >
                      Show less
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* ─── KNOWLEDGE & TRAINING ─── */}
      <Collapsible open={trainingOpen} onOpenChange={setTrainingOpen}>
        <CollapsibleTrigger asChild>
          <div>
            <SectionHeader
              label="Knowledge & Training"
              icon={BookOpen}
              isOpen={trainingOpen}
              onToggle={() => setTrainingOpen(o => !o)}
              color="amber"
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="border-border/40 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="p-0">
              <CompetencyInlineSummary
                competencies={competencies}
                overallProgress={overallProgress}
                sessionsCount={completedSessions.length}
                lastSessionDate={lastSessionDate}
                isLoading={compLoading}
                onOpenWorkspace={() => setDrawerOpen(true)}
              />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* ─── PERFORMANCE ─── */}
      <Collapsible open={performanceOpen} onOpenChange={setPerformanceOpen}>
        <CollapsibleTrigger asChild>
          <div>
            <SectionHeader
              label="Performance"
              icon={Activity}
              isOpen={performanceOpen}
              onToggle={() => setPerformanceOpen(o => !o)}
              color="emerald"
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AgentMonitorCard agent={agent} />
        </CollapsibleContent>
      </Collapsible>

      {/* Competency Drawer */}
      <CompetencyDrawer
        agent={agent}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onOpenTraining={() => setTrainingDialogOpen(true)}
        sessions={sessions}
        sessionsLoading={sessionsLoading}
        onRetrain={handleRetrain}
        onTest={handleTest}
      />

      {/* Training Dialog (train-only, no history tab) */}
      <AgentTrainingStudio
        agent={agent}
        dialogOpen={trainingDialogOpen}
        onDialogClose={() => setTrainingDialogOpen(false)}
      />
    </div>
  );
};

export default AgentProfileView;
