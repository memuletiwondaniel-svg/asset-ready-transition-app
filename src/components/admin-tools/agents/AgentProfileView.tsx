import React, { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Check, X, Users, Sparkles, BarChart3, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AgentProfile } from '@/data/agentProfiles';
import { agentProfiles } from '@/data/agentProfiles';

const SelmaValidation = lazy(() => import('@/pages/admin/SelmaValidation'));
const SelmaAnalytics = lazy(() => import('@/pages/admin/SelmaAnalytics'));
const FredValidation = lazy(() => import('@/pages/admin/FredValidation'));
const FredAnalytics = lazy(() => import('@/pages/admin/FredAnalytics'));

const statusConfig = {
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  planned: { label: 'Planned', className: 'bg-muted text-muted-foreground border-border' },
  'in-training': { label: 'In Training', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
};

interface AgentProfileViewProps {
  agent: AgentProfile;
  onBack: () => void;
  onAgentClick: (code: string) => void;
  initialTab?: string | null;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const AgentProfileView: React.FC<AgentProfileViewProps> = ({
  agent,
  onBack,
  onAgentClick,
  initialTab,
}) => {
  const status = statusConfig[agent.status];
  const collaborators = agent.worksWith
    .map(code => agentProfiles.find(a => a.code === code))
    .filter(Boolean) as AgentProfile[];

  const fallbackTab = agent.deepDiveTabs[0]?.toLowerCase() ?? 'configuration';
  const preferredTab = React.useMemo(() => {
    const normalizedInitialTab = initialTab?.toLowerCase();
    if (
      normalizedInitialTab &&
      agent.deepDiveTabs.some(tab => tab.toLowerCase() === normalizedInitialTab)
    ) {
      return normalizedInitialTab;
    }
    return fallbackTab;
  }, [agent.deepDiveTabs, fallbackTab, initialTab]);

  const [activeTab, setActiveTab] = React.useState(preferredTab);

  React.useEffect(() => {
    setActiveTab(preferredTab);
  }, [preferredTab, agent.code]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Overview
      </Button>

      {/* ─── Section 1: Agent Identity Card ─── */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-0">
          {/* Agent header row */}
          <div className="p-6 pb-5">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-border/30 shadow-lg shrink-0">
                <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h2 className="text-xl font-bold text-foreground">{agent.name}</h2>
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', status.className)}>
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-medium mb-3">{agent.role}</p>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  {agent.introduction}
                </p>
              </div>
            </div>
          </div>

          {/* Collaborators row */}
          {collaborators.length > 0 && (
            <div className="border-t border-border/30 px-6 py-4 bg-muted/20">
              <div className="flex items-center gap-3 flex-wrap">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 2: Capabilities Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Specializations */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              Areas of Specialization
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="flex flex-wrap gap-2">
              {agent.specializations.map((spec) => (
                <Badge
                  key={spec}
                  variant="secondary"
                  className="text-xs py-1 px-2.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15 font-normal"
                >
                  {spec}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Limitations */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="flex flex-wrap gap-2">
              {agent.limitations.map((lim) => (
                <Badge
                  key={lim}
                  variant="outline"
                  className="text-xs py-1 px-2.5 text-muted-foreground border-border/60 font-normal"
                >
                  {lim}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Section 3: Deep Dive Tabs ─── */}
      {agent.deepDiveTabs.length > 0 && (
        <Card className="border-border/40 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0 pt-4 px-5">
              <TabsList className="w-full justify-start bg-muted/50 p-1">
                {agent.deepDiveTabs.map((tab) => {
                  const tabIcons: Record<string, any> = {
                    analytics: BarChart3,
                    validation: Sparkles,
                    configuration: Sparkles,
                    feedback: BookOpen,
                    knowledge: BookOpen,
                  };
                  const Icon = tabIcons[tab.toLowerCase()] || Sparkles;
                  return (
                    <TabsTrigger key={tab} value={tab.toLowerCase()} className="gap-1.5 text-xs">
                      <Icon className="h-3.5 w-3.5" />
                      {tab}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              {agent.code === 'selma' && (
                <>
                  <TabsContent value="analytics" className="mt-0">
                    <Suspense fallback={<LoadingFallback />}>
                      <SelmaAnalytics />
                    </Suspense>
                  </TabsContent>
                  <TabsContent value="validation" className="mt-0">
                    <Suspense fallback={<LoadingFallback />}>
                      <SelmaValidation />
                    </Suspense>
                  </TabsContent>
                </>
              )}

              {agent.code === 'fred' && (
                <>
                  <TabsContent value="analytics" className="mt-0">
                    <Suspense fallback={<LoadingFallback />}>
                      <FredAnalytics />
                    </Suspense>
                  </TabsContent>
                  <TabsContent value="validation" className="mt-0">
                    <Suspense fallback={<LoadingFallback />}>
                      <FredValidation />
                    </Suspense>
                  </TabsContent>
                </>
              )

                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {agent.name}'s configuration panel
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Coming soon</p>
                </div>
              </TabsContent>

              <TabsContent value="feedback" className="mt-0">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {agent.name}'s feedback loop dashboard
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Coming soon</p>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
};

export default AgentProfileView;
