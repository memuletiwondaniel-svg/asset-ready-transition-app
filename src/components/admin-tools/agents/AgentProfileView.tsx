import React, { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentProfile } from '@/data/agentProfiles';
import { agentProfiles } from '@/data/agentProfiles';
import AgentIntroduction from './AgentIntroduction';
import AgentSpecializations from './AgentSpecializations';

const SelmaValidation = lazy(() => import('@/pages/admin/SelmaValidation'));
const SelmaAnalytics = lazy(() => import('@/pages/admin/SelmaAnalytics'));

const statusConfig = {
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  planned: { label: 'Planned', className: 'bg-muted text-muted-foreground border-border' },
  'in-training': { label: 'In Training', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
};

interface AgentProfileViewProps {
  agent: AgentProfile;
  onBack: () => void;
  onAgentClick: (code: string) => void;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const AgentProfileView: React.FC<AgentProfileViewProps> = ({ agent, onBack, onAgentClick }) => {
  const status = statusConfig[agent.status];
  const collaborators = agent.worksWith
    .map(code => agentProfiles.find(a => a.code === code))
    .filter(Boolean) as AgentProfile[];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Overview
      </Button>

      {/* Profile Header */}
      <Card className="border-border/40 overflow-hidden">
        <div className={cn("h-2 bg-gradient-to-r", agent.gradient)} />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-border/30 shadow-xl shrink-0">
              <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-foreground">{agent.name}</h2>
                <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full border", status.className)}>
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">{agent.role}</p>
              
              {/* Introduction with typewriter */}
              <AgentIntroduction 
                text={agent.introduction} 
                agentName={agent.name} 
                gradient={agent.gradient} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Works With */}
      {collaborators.length > 0 && (
        <Card className="border-border/40">
          <CardContent className="p-6">
            <h4 className="text-sm font-semibold text-foreground mb-4">I Work Closely With</h4>
            <div className="flex flex-wrap gap-3">
              {collaborators.map((collab) => (
                <div
                  key={collab.code}
                  className="flex items-center gap-2.5 bg-muted/50 hover:bg-muted rounded-xl px-3 py-2 cursor-pointer transition-colors group"
                  onClick={() => onAgentClick(collab.code)}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-border/30">
                    <img src={collab.avatar} alt={collab.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{collab.name}</p>
                    <p className="text-[10px] text-muted-foreground">{collab.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Specializations */}
      <Card className="border-border/40">
        <CardContent className="p-6">
          <AgentSpecializations
            specializations={agent.specializations}
            limitations={agent.limitations}
          />
        </CardContent>
      </Card>

      {/* Deep-Dive Tabs */}
      {agent.deepDiveTabs.length > 0 && (
        <Tabs defaultValue={agent.deepDiveTabs[0]?.toLowerCase()} className="w-full">
          <TabsList className="w-full justify-start">
            {agent.deepDiveTabs.map((tab) => (
              <TabsTrigger key={tab} value={tab.toLowerCase()}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Selma-specific deep dives */}
          {agent.code === 'selma' && (
            <>
              <TabsContent value="analytics">
                <Suspense fallback={<LoadingFallback />}>
                  <SelmaAnalytics />
                </Suspense>
              </TabsContent>
              <TabsContent value="validation">
                <Suspense fallback={<LoadingFallback />}>
                  <SelmaValidation />
                </Suspense>
              </TabsContent>
            </>
          )}

          <TabsContent value="configuration">
            <Card className="border-border/40">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {agent.name}'s configuration panel — coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card className="border-border/40">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {agent.name}'s feedback loop dashboard — coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AgentProfileView;
