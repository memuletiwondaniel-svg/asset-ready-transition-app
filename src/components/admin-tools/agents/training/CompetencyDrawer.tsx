import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2 } from 'lucide-react';
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
import TrainingHistoryPanel from './TrainingHistoryPanel';
import type { CompetencyArea } from '@/hooks/useAgentCompetencies';

type DrawerTab = 'competence' | 'sessions';

interface CompetencyDrawerProps {
  agent: AgentProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenTraining: () => void;
  sessions: any[];
  sessionsLoading: boolean;
  onRetrain: (session: any) => void;
  onTest: (session: any) => void;
  userName?: string;
  onOpenCompetenceChat?: (competencies: CompetencyArea[]) => void;
}

const CompetencyDrawer: React.FC<CompetencyDrawerProps> = ({
  agent,
  open,
  onOpenChange,
  onOpenTraining,
  sessions,
  sessionsLoading,
  onRetrain,
  onTest,
  userName,
  onOpenCompetenceChat,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('competence');
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

  // Backfill trigger: if all competencies are 0% but completed sessions exist
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

      // Refetch competency data to reflect updates
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

  const tabs: { key: DrawerTab; label: string }[] = [
    { key: 'competence', label: 'Competence' },
    { key: 'sessions', label: 'Sessions' },
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
            Training workspace for {agent.name}
          </SheetDescription>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img
                src={agent.avatar}
                alt={agent.name}
                className="w-6 h-6 rounded-full object-cover border border-border/30 shrink-0"
              />
              <SheetTitle className="text-sm font-semibold text-foreground">
                {agent.name} · Training Workspace
              </SheetTitle>
            </div>

            {/* Segmented tabs */}
            <div className="flex items-center bg-muted/60 border border-border/50 rounded-xl p-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSelectedCompetency(null); }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 cursor-pointer',
                    activeTab === tab.key
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Train button */}
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => { onOpenChange(false); onOpenTraining(); }}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Train
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'competence' && !selectedCompetency && (
              <CompetencyProfilePanel
                competencies={competencies}
                overallProgress={overallProgress}
                isLoading={isLoading}
                onSelectCompetency={setSelectedCompetency}
                onAddCompetency={() => setAddDialogOpen(true)}
                agentName={agent.name}
                onOpenCompetenceChat={() => onOpenCompetenceChat?.(competencies)}
                hasCompletedSessions={sessions.some((s: any) => s.status === 'completed')}
                isSyncing={isSyncing}
                onSyncCompetencies={triggerSync}
              />
            )}

            {activeTab === 'competence' && selectedCompetency && (
              <CompetencyDetailView
                competency={selectedCompetency}
                onBack={() => setSelectedCompetency(null)}
                onDelete={handleDeleteCompetency}
                onUpdateDescription={handleUpdateDescription}
                onTrain={() => { onOpenChange(false); onOpenTraining(); }}
                isUpdating={updateDescriptionAndReassess.isPending}
              />
            )}

            {activeTab === 'sessions' && (
              <div className="h-full overflow-y-auto p-4">
                <TrainingHistoryPanel
                  sessions={sessions}
                  agentCode={agent.code}
                  agentName={agent.name}
                  readOnly={false}
                  isLoading={sessionsLoading}
                  onRetrain={onRetrain}
                  onTest={onTest}
                />
              </div>
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
