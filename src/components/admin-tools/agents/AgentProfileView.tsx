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

interface AgentProfileViewProps {
  agent: AgentProfile;
  onAgentClick: (code: string) => void;
}

type SectionColor = 'blue' | 'amber' | 'emerald';

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
    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
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

  const collaborators = agent.worksWith
    .map(code => agentProfiles.find(a => a.code === code))
    .filter(Boolean) as AgentProfile[];

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
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="border-border/40 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground/80 leading-relaxed mb-4">
                {agent.introduction}
              </p>

              {collaborators.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap mb-4 pb-4 border-b border-border/30">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Specializations</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.specializations.map((spec) => (
                      <Badge
                        key={spec}
                        variant="secondary"
                        className="text-[10px] py-0.5 px-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-normal"
                      >
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Limitations</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.limitations.map((lim) => (
                      <Badge
                        key={lim}
                        variant="outline"
                        className="text-[10px] py-0.5 px-2 text-muted-foreground border-border/60 font-normal"
                      >
                        {lim}
                      </Badge>
                    ))}
                  </div>
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
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AgentTrainingStudio agent={agent} />
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
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AgentMonitorCard agent={agent} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default AgentProfileView;
