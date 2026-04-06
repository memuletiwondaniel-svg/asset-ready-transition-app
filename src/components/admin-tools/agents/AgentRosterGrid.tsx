import React from 'react';
import { Brain } from 'lucide-react';
import { agentProfiles } from '@/data/agentProfiles';
import { cn } from '@/lib/utils';

interface AgentRosterGridProps {
  onAgentClick: (code: string) => void;
  showHubCard?: boolean;
  onHubClick?: () => void;
}

const AgentRosterGrid: React.FC<AgentRosterGridProps> = ({ onAgentClick, showHubCard, onHubClick }) => {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {showHubCard && (
        <div
          className="group bg-card border border-border/40 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:border-border/80 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] relative h-[72px] flex items-center"
          onClick={onHubClick}
        >
          <div className="flex items-start gap-3 pr-6 w-full">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  AI Agents Hub
                </h3>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {agentProfiles.length} agents
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                Overview, profiles, relationships
              </p>
            </div>
          </div>
        </div>
      )}

      {agentProfiles.map((agent) => (
        <div
          key={agent.code}
          className="group bg-card border border-border/40 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:border-border/80 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] relative h-[72px] flex items-center"
          onClick={() => onAgentClick(agent.code)}
        >
          <div className="flex items-start gap-3 pr-6 w-full">
            <div className="w-9 h-9 aspect-square rounded-full shrink-0 group-hover:scale-110 transition-transform duration-300 overflow-hidden border-2 border-border/60">
              <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {agent.name}
                </h3>
                {agent.status === 'planned' && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    planned
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {agent.role}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgentRosterGrid;
