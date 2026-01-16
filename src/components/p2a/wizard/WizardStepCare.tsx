import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Heart, Info, CheckCircle2 } from 'lucide-react';
import { usePACPrerequisites, usePACCategories, usePACTemplates } from '@/hooks/useHandoverPrerequisites';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { PrerequisiteCard } from './PrerequisiteCard';
import { PrerequisiteStatus, DeviationData } from '@/hooks/useP2AHandoverPrerequisites';
import { PrerequisiteLocalState } from './WizardStepOperationalControl';

interface WizardStepCareProps {
  selectedTemplateId: string | null;
  ignoreTemplates: boolean;
  prerequisiteStates: Map<string, PrerequisiteLocalState>;
  onPrerequisiteChange: (pacPrerequisiteId: string, state: PrerequisiteLocalState) => void;
}

export const WizardStepCare: React.FC<WizardStepCareProps> = ({
  selectedTemplateId,
  ignoreTemplates,
  prerequisiteStates,
  onPrerequisiteChange,
}) => {
  const { data: allPrerequisites, isLoading: prereqsLoading } = usePACPrerequisites();
  const { data: categories, isLoading: categoriesLoading } = usePACCategories();
  const { data: templates } = usePACTemplates();
  const { data: users } = useProfileUsers();

  // Get selected template
  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  // Filter to CARE category
  const careCategory = categories?.find(c => c.name === 'CARE');

  // Filter prerequisites based on category and template
  const filteredPrerequisites = useMemo(() => {
    if (!allPrerequisites || !careCategory) return [];

    let prerequisites = allPrerequisites.filter(
      p => p.category_id === careCategory.id
    );

    // If a template is selected and not ignored, filter to template prerequisites
    if (selectedTemplate && !ignoreTemplates) {
      prerequisites = prerequisites.filter(
        p => selectedTemplate.prerequisite_ids.includes(p.id)
      );
    }

    return prerequisites.sort((a, b) => a.display_order - b.display_order);
  }, [allPrerequisites, careCategory, selectedTemplate, ignoreTemplates]);

  // Calculate progress
  const progress = useMemo(() => {
    if (filteredPrerequisites.length === 0) return { completed: 0, total: 0, percentage: 0 };

    const completed = filteredPrerequisites.filter(p => {
      const state = prerequisiteStates.get(p.id);
      return state?.status === 'COMPLETED' || state?.status === 'NOT_APPLICABLE';
    }).length;

    return {
      completed,
      total: filteredPrerequisites.length,
      percentage: Math.round((completed / filteredPrerequisites.length) * 100),
    };
  }, [filteredPrerequisites, prerequisiteStates]);

  // Helper to get or create state for a prerequisite
  const getState = (prereqId: string): PrerequisiteLocalState => {
    return prerequisiteStates.get(prereqId) || {
      status: 'NOT_COMPLETED',
      comments: '',
      evidenceLinks: [],
      uploadedFiles: [],
      receivingPartyUserId: null,
    };
  };

  // Helper to create handover prerequisite-like object for the card
  const createHandoverPrereq = (prereqId: string) => {
    const state = getState(prereqId);
    return {
      id: prereqId,
      handover_id: '',
      pac_prerequisite_id: prereqId,
      status: state.status,
      evidence_links: state.evidenceLinks,
      comments: state.comments,
      receiving_party_user_id: state.receivingPartyUserId,
      deviation_reason: state.deviationData?.deviation_reason || null,
      mitigation: state.deviationData?.mitigation || null,
      follow_up_action: state.deviationData?.follow_up_action || null,
      target_date: state.deviationData?.target_date || null,
      completed_by: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  // Handlers
  const handleStatusChange = (prereqId: string, status: PrerequisiteStatus, deviationData?: DeviationData) => {
    const currentState = getState(prereqId);
    onPrerequisiteChange(prereqId, {
      ...currentState,
      status,
      deviationData: status === 'DEVIATION' ? deviationData : undefined,
    });
  };

  const handleCommentsChange = (prereqId: string, comments: string) => {
    const currentState = getState(prereqId);
    onPrerequisiteChange(prereqId, { ...currentState, comments });
  };

  const handleAddEvidenceLink = (prereqId: string, link: string) => {
    const currentState = getState(prereqId);
    onPrerequisiteChange(prereqId, {
      ...currentState,
      evidenceLinks: [...currentState.evidenceLinks, link],
    });
  };

  const handleRemoveEvidenceLink = (prereqId: string, link: string) => {
    const currentState = getState(prereqId);
    onPrerequisiteChange(prereqId, {
      ...currentState,
      evidenceLinks: currentState.evidenceLinks.filter(l => l !== link),
    });
  };

  const handleReceivingPartyChange = (prereqId: string, userId: string | null) => {
    const currentState = getState(prereqId);
    onPrerequisiteChange(prereqId, { ...currentState, receivingPartyUserId: userId });
  };

  const handleFileUpload = (prereqId: string, files: File[]) => {
    const currentState = getState(prereqId);
    onPrerequisiteChange(prereqId, {
      ...currentState,
      uploadedFiles: [...currentState.uploadedFiles, ...files],
    });
  };

  const handleRemoveFile = (prereqId: string, file: File) => {
    const currentState = getState(prereqId);
    onPrerequisiteChange(prereqId, {
      ...currentState,
      uploadedFiles: currentState.uploadedFiles.filter(f => f !== file),
    });
  };

  const isLoading = prereqsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Heart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {careCategory?.display_name || 'Handover of CARE'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {careCategory?.description || 'Complete prerequisites for handover of care, custody and maintenance responsibilities'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Completion Progress</span>
            <Badge variant={progress.percentage === 100 ? 'default' : 'secondary'}>
              {progress.completed} / {progress.total}
            </Badge>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          {progress.percentage === 100 && (
            <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">All prerequisites completed!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      {selectedTemplate && !ignoreTemplates && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Showing prerequisites from template: <strong>{selectedTemplate.name}</strong>. 
            {filteredPrerequisites.length} of {allPrerequisites?.filter(p => p.category_id === careCategory?.id).length} prerequisites selected.
          </AlertDescription>
        </Alert>
      )}

      {/* Prerequisites List */}
      <div className="space-y-3">
        {filteredPrerequisites.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No prerequisites found for this category.
            </CardContent>
          </Card>
        ) : (
          filteredPrerequisites.map((prereq, index) => (
            <div key={prereq.id} className="relative">
              <div className="absolute -left-6 top-4 text-xs font-medium text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center">
                {index + 1}
              </div>
              <PrerequisiteCard
                pacPrerequisite={prereq}
                handoverPrerequisite={createHandoverPrereq(prereq.id)}
                onStatusChange={(status, deviationData) => handleStatusChange(prereq.id, status, deviationData)}
                onCommentsChange={(comments) => handleCommentsChange(prereq.id, comments)}
                onAddEvidenceLink={(link) => handleAddEvidenceLink(prereq.id, link)}
                onRemoveEvidenceLink={(link) => handleRemoveEvidenceLink(prereq.id, link)}
                onReceivingPartyChange={(userId) => handleReceivingPartyChange(prereq.id, userId)}
                onFileUpload={(files) => handleFileUpload(prereq.id, files)}
                onRemoveFile={(file) => handleRemoveFile(prereq.id, file)}
                uploadedFiles={getState(prereq.id).uploadedFiles}
                users={users?.map(u => ({ id: u.user_id, full_name: u.full_name, position: u.position || undefined })) || []}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};