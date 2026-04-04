import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { getAgentByCode } from '@/data/agentProfiles';
import AgentOverview from '@/components/admin-tools/agents/AgentOverview';
import AgentProfileView from '@/components/admin-tools/agents/AgentProfileView';

const AIAgentHub: React.FC = () => {
  const { agentCode } = useParams();
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(agentCode || null);

  const agent = selectedAgent ? getAgentByCode(selectedAgent) : null;

  const handleAgentClick = (code: string) => {
    setSelectedAgent(code);
    navigate(`/admin/ai-agents/${code}`, { replace: true });
  };

  const handleBack = () => {
    setSelectedAgent(null);
    navigate('/admin/ai-agents', { replace: true });
  };

  const handleBackToAdmin = () => {
    navigate('/admin-tools', { state: { activeView: 'dashboard', navKey: Date.now() } });
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10">
        <BreadcrumbNavigation currentPageLabel="AI Agents" />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackToAdmin} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Agents Hub</h1>
              <p className="text-xs text-muted-foreground">Manage, monitor, and configure your AI team</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container pt-6 pb-20 md:pb-8 max-w-5xl mx-auto px-4 md:px-6">
          {agent ? (
            <AgentProfileView agent={agent} onBack={handleBack} onAgentClick={handleAgentClick} />
          ) : (
            <AgentOverview onAgentClick={handleAgentClick} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAgentHub;
