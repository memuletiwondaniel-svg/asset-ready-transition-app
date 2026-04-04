import React from 'react';
import { cn } from '@/lib/utils';
import type { AgentProfile } from '@/data/agentProfiles';

interface AgentCardProps {
  agent: AgentProfile;
  onClick: () => void;
  size?: 'sm' | 'md';
}

const statusConfig = {
  active: { label: 'Active', dotClass: 'bg-emerald-500 animate-pulse', textClass: 'text-emerald-600' },
  planned: { label: 'Planned', dotClass: 'bg-muted-foreground/40', textClass: 'text-muted-foreground' },
  'in-training': { label: 'Training', dotClass: 'bg-amber-500 animate-pulse', textClass: 'text-amber-600' },
};

const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick, size = 'md' }) => {
  const status = statusConfig[agent.status];

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative bg-card border border-border/40 rounded-2xl cursor-pointer",
        "hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 hover:border-border/80",
        "transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
        "overflow-hidden",
        size === 'sm' ? 'p-4' : 'p-5'
      )}
    >
      {/* Gradient accent top bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", agent.gradient, "opacity-60 group-hover:opacity-100 transition-opacity")} />
      
      <div className="flex flex-col items-center text-center gap-3">
        {/* Avatar */}
        <div className={cn(
          "relative rounded-full overflow-hidden border-2 border-border/30 group-hover:border-primary/30 transition-all duration-300 group-hover:scale-105",
          size === 'sm' ? 'w-16 h-16' : 'w-24 h-24'
        )}>
          <img 
            src={agent.avatar} 
            alt={agent.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          {agent.status !== 'active' && (
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px]" />
          )}
        </div>

        {/* Name & Role */}
        <div>
          <h3 className={cn(
            "font-semibold text-foreground group-hover:text-primary transition-colors",
            size === 'sm' ? 'text-sm' : 'text-base'
          )}>
            {agent.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{agent.role}</p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className={cn("w-2 h-2 rounded-full", status.dotClass)} />
          <span className={cn("text-[10px] font-medium uppercase tracking-wider", status.textClass)}>
            {status.label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
