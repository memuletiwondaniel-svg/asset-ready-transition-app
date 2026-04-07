import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AgentProfile } from '@/data/agentProfiles';
import { agentProfiles } from '@/data/agentProfiles';
import AgentTrainingStudio from './AgentTrainingStudio';
import AgentMonitorCard from './AgentMonitorCard';

interface AgentProfileViewProps {
  agent: AgentProfile;
  onAgentClick: (code: string) => void;
}

const AgentProfileView: React.FC<AgentProfileViewProps> = ({ agent, onAgentClick }) => {
  const collaborators = agent.worksWith
    .map(code => agentProfiles.find(a => a.code === code))
    .filter(Boolean) as AgentProfile[];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Agent Profile Card ─── */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground/80 leading-relaxed mb-4">
            {agent.introduction}
          </p>

          {/* Collaborators */}
          {collaborators.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap mb-4 pb-4 border-b border-border/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
                <Users className="h-3.5 w-3.5" />
                Works with
              </div>
              {collaborators.map((collab) => (
                <button
                  key={collab.code}
                  className="flex items-center gap-2 bg-background hover:bg-accent rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors border border-border/40 group"
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

          {/* Capabilities Grid */}
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

      {/* ─── Two Column: Training + Monitor ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <AgentTrainingStudio agent={agent} />
        </div>
        <div className="lg:col-span-2">
          <AgentMonitorCard agent={agent} />
        </div>
      </div>
    </div>
  );
};

export default AgentProfileView;
