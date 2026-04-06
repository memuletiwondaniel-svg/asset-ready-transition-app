import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Users, Zap, BarChart3 } from 'lucide-react';
import { agentProfiles, getActiveAgents, getPlannedAgents } from '@/data/agentProfiles';
import AgentCard from './AgentCard';
import AgentRelationshipMap from './AgentRelationshipMap';

interface AgentOverviewProps {
  onAgentClick: (code: string) => void;
}

const AgentOverview: React.FC<AgentOverviewProps> = ({ onAgentClick }) => {
  const activeAgents = getActiveAgents();
  const plannedAgents = getPlannedAgents();

  const stats = [
    { label: 'Total Agents', value: agentProfiles.length, icon: Brain, color: 'text-violet-500' },
    { label: 'Active', value: activeAgents.length, icon: Zap, color: 'text-emerald-500' },
    { label: 'Planned', value: plannedAgents.length, icon: BarChart3, color: 'text-amber-500' },
    { label: 'Collaborations', value: '12+', icon: Users, color: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Meet the ORSH AI Team</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          {agentProfiles.length} specialized AI agents working together to power your operational readiness workflows. 
          Each agent has unique expertise and collaborates seamlessly with others.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Relationship Map */}
      <Card className="border-border/40">
        <CardContent className="p-6">
          <AgentRelationshipMap onAgentClick={onAgentClick} />
        </CardContent>
      </Card>

    </div>
  );
};

export default AgentOverview;
