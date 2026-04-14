import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { AgentProfile } from '@/data/agentProfiles';
import { useAgentCompetencies } from '@/hooks/useAgentCompetencies';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CompetencyProfilePanel from './CompetencyProfilePanel';
import CompetencyDetailView from './CompetencyDetailView';
import AddCompetencyDialog from './AddCompetencyDialog';
import SessionsHistoryPanel from './SessionsHistoryPanel';
import type { CompetencyArea } from '@/hooks/useAgentCompetencies';

type DrawerTab = 'competencies' | 'sessions';

interface CompetencyDrawerProps {
  agent: AgentProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenTraining: (options?: { competencyContext?: CompetencyArea[] }) => void;
  sessions: any[];
  sessionsLoading: boolean;
  userName?: string;
}

const CompetencyDrawer: React.FC<CompetencyDrawerProps> = ({
  agent,
  open,
  onOpenChange,
  onOpenTraining,
  sessions,
  sessionsLoading,
  userName,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('competencies');
  const [selectedCompetency, setSelectedCompetency] = useState<CompetencyArea | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const backfillTriggered = useRef(false);

  const {
    competencies,
    isLoading,
    overallProgress,
    refetch,
    createCompetency,
    deleteCompetency,
    updateDescriptionAndReassess,
  } = useAgentCompetencies(agent.code, agent);

  // Reset to competencies tab when drawer opens
  useEffect(() => {
    if (open) {
      setActiveTab('competencies');
      setSelectedCompetency(null);
    }
  }, [open]);

  // Backfill trigger
  useEffect(() => {
    if (!open || backfillTriggered.current || isLoading) return;
    if (competencies.length === 0) return;
    const allZero = competencies.every(c => c.progress === 0);
    const hasCompleted = sessions.some((s: any) => s.status === 'completed');
    if (allZero && hasCompleted) {
      backfillTriggered.current = true;
      setIsSyncing(true);
      triggerSync();
    }
  }, [open, competencies, sessions, isLoading, agent.code, agent.name]);

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('assess-agent-competencies', {
        body: { agent_code: agent.code, trigger_type: 'manual_sync' },
      });
      if (error) {
        console.error('Competency sync failed:', error);
        toast.error(`Competency sync failed — use Reassess now to retry`, {
          description: error.message || 'Edge function error',
        });
        return;
      }
      const result = data as any;
      if (result?.success && result?.updated?.length > 0) {
        toast.success(`Updated ${result.updated.length} competency area${result.updated.length !== 1 ? 's' : ''}`, {
          description: `${agent.name}'s competency profile has been synced from training history.`,
        });
      } else if (result?.success) {
        toast.info(`No competency changes detected.`);
      }
      await refetch();
    } catch (err) {
      console.error('Competency sync error:', err);
      toast.error(`Competency sync failed — use Reassess now to retry`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddCompetency = async (input: { name: string; description?: string }) => {
    setIsAssessing(true);
    try {
      await createCompetency.mutateAsync(input);
      toast.success(`"${input.name}" added. AI assessment will run shortly.`);
    } catch {
      toast.error('Failed to add competency area');
    } finally {
      setIsAssessing(false);
    }
  };

  const handleDeleteCompetency = async (id: string) => {
    try {
      await deleteCompetency.mutateAsync(id);
      setSelectedCompetency(null);
      toast.success('Competency area removed');
    } catch {
      toast.error('Failed to delete competency area');
    }
  };

  const handleUpdateDescription = async (id: string, description: string) => {
    try {
      await updateDescriptionAndReassess.mutateAsync({ id, newDescription: description });
      toast.success('Description updated. Reassessing...');
    } catch {
      toast.error('Failed to update description');
    }
  };

  const handleOpenTraining = (competencyContext?: CompetencyArea[]) => {
    onOpenChange(false);
    onOpenTraining({ competencyContext: competencyContext || competencies });
  };

  const completedCount = sessions.filter((s: any) => s.status === 'completed').length;

  const tabs: { key: DrawerTab; label: string; count?: number }[] = [
    { key: 'competencies', label: 'Competencies', count: competencies.length },
    { key: 'sessions', label: 'Sessions', count: completedCount },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-[720px] w-full p-0 flex flex-col gap-0"
          overlayClassName="bg-black/60 backdrop-blur-sm"
        >
          <SheetDescription className="sr-only">
            Competence development workspace for {agent.name}
          </SheetDescription>

          {/* Header with tabs */}
          <div className="border-b border-border/40">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <img
                  src={agent.avatar}
                  alt={agent.name}
                  className="w-6 h-6 rounded-full object-cover border border-border/30 shrink-0"
                />
                <SheetTitle className="text-sm font-semibold text-foreground">
                  Competence Development
                </SheetTitle>
              </div>
            </div>

            {/* Tab bar */}
            {!selectedCompetency && (
              <div className="flex px-4 gap-1">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "relative px-3 py-2 text-xs font-medium transition-colors duration-200",
                      activeTab === tab.key
                        ? "text-foreground"
                        : "text-muted-foreground/60 hover:text-muted-foreground"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={cn(
                          "text-[9px] px-1.5 py-0 rounded-full tabular-nums",
                          activeTab === tab.key
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/50 text-muted-foreground/50"
                        )}>
                          {tab.count}
                        </span>
                      )}
                    </span>
                    {activeTab === tab.key && (
                      <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'competencies' && !selectedCompetency && (
              <CompetencyProfilePanel
                competencies={competencies}
                overallProgress={overallProgress}
                isLoading={isLoading}
                onSelectCompetency={setSelectedCompetency}
                onAddCompetency={() => setAddDialogOpen(true)}
                agentName={agent.name}
                onOpenTraining={() => handleOpenTraining()}
                hasCompletedSessions={sessions.some((s: any) => s.status === 'completed')}
                isSyncing={isSyncing}
                onSyncCompetencies={triggerSync}
              />
            )}

            {activeTab === 'sessions' && !selectedCompetency && (
              <SessionsHistoryPanel
                sessions={sessions}
                isLoading={sessionsLoading}
                agentName={agent.name}
              />
            )}

            {selectedCompetency && (
              <CompetencyDetailView
                competency={selectedCompetency}
                onBack={() => setSelectedCompetency(null)}
                onDelete={handleDeleteCompetency}
                onUpdateDescription={handleUpdateDescription}
                onTrain={() => handleOpenTraining([selectedCompetency])}
                isUpdating={updateDescriptionAndReassess.isPending}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AddCompetencyDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleAddCompetency}
        isSaving={isAssessing}
      />
    </>
  );
};

export default CompetencyDrawer;
