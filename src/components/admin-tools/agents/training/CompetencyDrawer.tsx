import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { AgentProfile } from '@/data/agentProfiles';
import { useAgentCompetencies } from '@/hooks/useAgentCompetencies';
import { toast } from 'sonner';
import CompetencyProfilePanel from './CompetencyProfilePanel';
import CompetencyDetailView from './CompetencyDetailView';
import AddCompetencyDialog from './AddCompetencyDialog';
import TrainingHistoryPanel from './TrainingHistoryPanel';
import type { CompetencyArea } from '@/hooks/useAgentCompetencies';

type DrawerTab = 'competence' | 'sessions' | 'chat';

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
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('competence');
  const [selectedCompetency, setSelectedCompetency] = useState<CompetencyArea | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);

  const {
    competencies,
    isLoading,
    overallProgress,
    createCompetency,
    deleteCompetency,
    updateDescriptionAndReassess,
  } = useAgentCompetencies(agent.code, agent);

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
    { key: 'chat', label: 'Ask ' + agent.name },
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
            <div className="flex-1 min-w-0">
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
                    'px-3 py-1 text-[11px] font-medium rounded-lg transition-all duration-200',
                    activeTab === tab.key
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
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

            {activeTab === 'chat' && (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-4">
                <p className="text-center">
                  Ask {agent.name} chat coming soon.<br />
                  <span className="text-[10px] text-muted-foreground/60">Use the Competence tab to manage areas, or Add Competency to create new ones.</span>
                </p>
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
