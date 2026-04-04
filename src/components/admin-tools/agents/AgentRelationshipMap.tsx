import React from 'react';
import { agentProfiles, type AgentProfile } from '@/data/agentProfiles';
import { cn } from '@/lib/utils';

interface AgentRelationshipMapProps {
  onAgentClick: (code: string) => void;
}

const AgentRelationshipMap: React.FC<AgentRelationshipMapProps> = ({ onAgentClick }) => {
  // Bob is the center hub
  const bob = agentProfiles.find(a => a.code === 'bob')!;
  const specialists = agentProfiles.filter(a => a.code !== 'bob');

  return (
    <div className="relative py-8">
      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground mb-6 text-center">How the AI Team Works Together</h3>
      
      <div className="flex flex-col items-center gap-8">
        {/* Bob - Center hub */}
        <div 
          className="flex flex-col items-center gap-2 cursor-pointer group"
          onClick={() => onAgentClick('bob')}
        >
          <div className={cn(
            "w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400/50 group-hover:border-amber-400 transition-all shadow-lg shadow-amber-500/20 group-hover:scale-110"
          )}>
            <img src={bob.avatar} alt={bob.name} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <span className="text-xs font-semibold text-foreground">{bob.name}</span>
          <span className="text-[10px] text-muted-foreground">{bob.role}</span>
        </div>

        {/* Connection lines visual */}
        <div className="flex items-center gap-1">
          <div className="w-px h-6 bg-border" />
          <span className="text-[10px] text-muted-foreground px-3 py-1 bg-muted/50 rounded-full">routes to specialists</span>
          <div className="w-px h-6 bg-border" />
        </div>

        {/* Specialist agents row - centered */}
        <div className="flex justify-center gap-6 sm:gap-8 flex-wrap max-w-2xl">
          {specialists.map((agent) => (
            <div
              key={agent.code}
              className="flex flex-col items-center gap-1.5 cursor-pointer group w-[100px]"
              onClick={() => onAgentClick(agent.code)}
            >
              <div className="relative">
                <div className={cn(
                  "w-12 h-12 rounded-full overflow-hidden border-2 transition-all",
                  agent.status === 'active' 
                    ? 'border-border/50 group-hover:border-primary/50 group-hover:scale-110 shadow-md' 
                    : 'border-border/30 opacity-60 group-hover:opacity-80 group-hover:scale-105'
                )}>
                  <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                {agent.status === 'active' && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
                )}
              </div>
              <span className="text-[11px] font-medium text-foreground group-hover:text-primary transition-colors">
                {agent.name}
              </span>
              <span className="text-[9px] text-muted-foreground leading-tight text-center line-clamp-2">
                {agent.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentRelationshipMap;
