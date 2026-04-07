import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AgentProfile } from '@/data/agentProfiles';

const statusConfig = {
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  planned: { label: 'Planned', className: 'bg-muted text-muted-foreground border-border' },
  'in-training': { label: 'In Training', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
};

interface AgentDetailHeaderProps {
  agent: AgentProfile;
}

const AgentDetailHeader: React.FC<AgentDetailHeaderProps> = ({ agent }) => {
  const status = statusConfig[agent.status];

  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-border/40 shadow-lg shrink-0">
        <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-foreground">{agent.name}</h1>
          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', status.className)}>
            {status.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{agent.role}</p>
      </div>
    </div>
  );
};

export default AgentDetailHeader;
