import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { getAgentByCode } from '@/data/agentProfiles';
import AgentOverview from '@/components/admin-tools/agents/AgentOverview';
import AgentProfileView from '@/components/admin-tools/agents/AgentProfileView';
import AgentDetailHeader from '@/components/admin-tools/agents/AgentDetailHeader';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

const AIAgentHub: React.FC = () => {
  const { agentCode } = useParams();
  const navigate = useNavigate();
  const agent = agentCode ? getAgentByCode(agentCode) : null;

  React.useEffect(() => {
    if (agentCode && !agent) {
      navigate('/admin/ai-agents', { replace: true });
    }
  }, [agent, agentCode, navigate]);

  const handleAgentClick = (code: string) => {
    navigate(`/admin/ai-agents/${code}`, { replace: true });
  };

  const handleBackToAgents = () => {
    navigate('/admin/ai-agents', { replace: true });
  };

  return (
    <AnimatedBackground className="flex-1 flex flex-col overflow-y-auto">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10">
        <BreadcrumbNavigation
          currentPageLabel={agent ? agent.name : "AI Agents"}
          favoritePath={agent ? `/admin/ai-agents/${agent.code}` : '/admin/ai-agents'}
          customBreadcrumbs={agent ? [
            { label: 'Home', path: '/', onClick: () => navigate('/') },
            { label: 'AI Agents', path: '/admin/ai-agents', onClick: handleBackToAgents },
          ] : [
            { label: 'Home', path: '/', onClick: () => navigate('/') },
          ]}
        />
        <div className="mt-2">
          {agent ? (
            <AgentDetailHeader agent={agent} />
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AI Agents Hub</h1>
                <p className="text-xs text-muted-foreground">Manage, monitor, and configure your AI team</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="container pt-6 pb-20 md:pb-8 max-w-5xl mx-auto px-4 md:px-6">
          {agent ? (
            <AgentProfileView
              agent={agent}
              onAgentClick={handleAgentClick}
            />
          ) : (
            <AgentOverview onAgentClick={handleAgentClick} />
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default AIAgentHub;
