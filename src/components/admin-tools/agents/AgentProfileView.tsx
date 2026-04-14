import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ChevronDown, BookOpen, Activity } from 'lucide-react';
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
import type { CompetencyArea } from '@/hooks/useAgentCompetencies';

interface AgentProfileViewProps {
  agent: AgentProfile;
  onAgentClick: (code: string) => void;
}

type SectionColor = 'blue' | 'amber' | 'emerald';

const sectionColorMap: Record<SectionColor, { icon: string }> = {
  blue:    { icon: 'text-blue-600 dark:text-blue-400' },
  amber:   { icon: 'text-amber-600 dark:text-amber-400' },
  emerald: { icon: 'text-emerald-600 dark:text-emerald-400' },
};

const AgentProfileView: React.FC<AgentProfileViewProps> = ({ agent, onAgentClick }) => {
  const [aboutOpen, setAboutOpen] = React.useState(true);
  const [trainingOpen, setTrainingOpen] = React.useState(true);
  const [performanceOpen, setPerformanceOpen] = React.useState(true);
  const [bioExpanded, setBioExpanded] = React.useState(false);

  // Competency + Drawer state
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = React.useState(false);
  const [competenceChatTitle, setCompetenceChatTitle] = React.useState<string | undefined>();
  const [competenceChatContext, setCompetenceChatContext] = React.useState<CompetencyArea[] | undefined>();

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

  const handleRetrain = (session: any) => {
    setTrainingDialogOpen(true);
  };

  const handleTest = (session: any) => {
    setTrainingDialogOpen(true);
  };

  const handleOpenCompetenceChat = (comps: CompetencyArea[]) => {
    setDrawerOpen(false);
    setCompetenceChatTitle('Competence Development');
    setCompetenceChatContext(comps);
    setTrainingDialogOpen(true);
  };

  const renderSectionHeader = (
    label: string,
    Icon: React.ElementType,
    isOpen: boolean,
    color: SectionColor,
  ) => {
    const c = sectionColorMap[color];
    return (
      <div className={cn(
        "flex items-center gap-3 px-5 py-3 cursor-pointer select-none transition-colors hover:bg-muted/30",
        isOpen && "border-b border-border/30"
      )}>
        <Icon className={cn("h-4 w-4", c.icon)} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
          {label}
        </span>
        <div className="flex-1" />
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground/40 transition-transform duration-200', isOpen ? 'rotate-0' : '-rotate-90')}
        />
      </div>
    );
  };

  return (
    <div className="space-y-2 animate-fade-in">
      {/* ─── ABOUT [AGENT] ─── */}
      <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
        <Card className="border-border/40 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <div>
              {renderSectionHeader(`About ${agent.name}`, Users, aboutOpen, 'blue')}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
                <div className="flex items-center gap-3 flex-wrap mt-3">
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
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ─── COMPETENCE DEVELOPMENT ─── */}
      <Collapsible open={trainingOpen} onOpenChange={setTrainingOpen}>
        <Card className="border-border/40 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <div>
              {renderSectionHeader('Competence Development', BookOpen, trainingOpen, 'amber')}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CompetencyInlineSummary
              competencies={competencies}
              overallProgress={overallProgress}
              sessionsCount={completedSessions.length}
              lastSessionDate={lastSessionDate}
              isLoading={compLoading}
              onOpenWorkspace={() => setDrawerOpen(true)}
            />
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ─── PERFORMANCE ─── */}
      <Collapsible open={performanceOpen} onOpenChange={setPerformanceOpen}>
        <Card className="border-border/40 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <div>
              {renderSectionHeader('Performance', Activity, performanceOpen, 'emerald')}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <AgentMonitorCard agent={agent} />
          </CollapsibleContent>
        </Card>
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
        onOpenCompetenceChat={handleOpenCompetenceChat}
      />

      {/* Training Dialog (train-only, no history tab) */}
      <AgentTrainingStudio
        agent={agent}
        dialogOpen={trainingDialogOpen}
        onDialogClose={() => {
          setTrainingDialogOpen(false);
          setCompetenceChatTitle(undefined);
          setCompetenceChatContext(undefined);
        }}
        initialSessionTitle={competenceChatTitle}
        competencyContext={competenceChatContext}
      />
    </div>
  );
};

export default AgentProfileView;
