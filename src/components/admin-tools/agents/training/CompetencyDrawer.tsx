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
import type { CompetencyArea } from '@/hooks/useAgentCompetencies';

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

  const handleOpenTraining = (competencyContext?: CompetencyArea[]) => {
    onOpenChange(false);
    onOpenTraining({ competencyContext: competencyContext || competencies });
  };

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

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
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

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {!selectedCompetency && (
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
