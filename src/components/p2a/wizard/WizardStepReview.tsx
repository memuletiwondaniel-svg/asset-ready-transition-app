import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProjects } from '@/hooks/useProjects';
import { usePACTemplates } from '@/hooks/useHandoverPrerequisites';
import { 
  Building2, 
  ClipboardList, 
  Award, 
  FileText, 
  Users, 
  CheckCircle2,
  Shield,
  Heart,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { PrerequisiteLocalState } from './WizardStepOperationalControl';
import { ApproverConfig } from './WizardStepApproversConfig';

interface WizardStepReviewProps {
  projectId: string;
  phase: 'PAC' | 'FAC';
  handoverScope: string;
  selectedTemplateId: string | null;
  ignoreTemplates: boolean;
  prerequisiteStates: Map<string, PrerequisiteLocalState>;
  approvers: ApproverConfig[];
  operationalControlProgress: { completed: number; total: number };
  careProgress: { completed: number; total: number };
}

export const WizardStepReview: React.FC<WizardStepReviewProps> = ({
  projectId,
  phase,
  handoverScope,
  selectedTemplateId,
  ignoreTemplates,
  prerequisiteStates,
  approvers,
  operationalControlProgress,
  careProgress,
}) => {
  const { projects } = useProjects();
  const { data: templates } = usePACTemplates();

  const selectedProject = projects?.find(p => p.id === projectId);
  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  // Count deviations
  const deviations = Array.from(prerequisiteStates.values()).filter(
    s => s.status === 'DEVIATION'
  );

  // Overall progress
  const totalPrereqs = operationalControlProgress.total + careProgress.total;
  const totalCompleted = operationalControlProgress.completed + careProgress.completed;
  const overallPercentage = totalPrereqs > 0 ? Math.round((totalCompleted / totalPrereqs) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">Ready to Create Handover</p>
              <p className="text-sm text-muted-foreground">
                Review the details below and click "Create Handover" to proceed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Project & Phase */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Project & Phase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Project</p>
              <p className="font-medium text-sm">
                {selectedProject 
                  ? `${selectedProject.project_id_prefix}-${selectedProject.project_id_number} - ${selectedProject.project_title}`
                  : 'Not selected'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Handover Phase</p>
              <Badge variant={phase === 'PAC' ? 'default' : 'secondary'} className="mt-1">
                {phase === 'PAC' ? (
                  <><ClipboardList className="h-3 w-3 mr-1" /> Provisional Acceptance (PAC)</>
                ) : (
                  <><Award className="h-3 w-3 mr-1" /> Final Acceptance (FAC)</>
                )}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Template</p>
              <p className="text-sm">
                {ignoreTemplates 
                  ? 'No template (all prerequisites)' 
                  : selectedTemplate 
                    ? selectedTemplate.name 
                    : 'No template selected'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Scope */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Handover Scope
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {handoverScope || <span className="text-muted-foreground italic">No scope defined</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prerequisites Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Prerequisites Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Completion</span>
              <Badge variant={overallPercentage === 100 ? 'default' : 'secondary'}>
                {totalCompleted} / {totalPrereqs}
              </Badge>
            </div>
            <Progress value={overallPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Operational Control */}
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium">Operational Control</p>
              </div>
              <div className="flex items-center justify-between">
                <Progress 
                  value={operationalControlProgress.total > 0 
                    ? (operationalControlProgress.completed / operationalControlProgress.total) * 100 
                    : 0} 
                  className="h-1.5 flex-1 mr-3" 
                />
                <span className="text-xs text-muted-foreground">
                  {operationalControlProgress.completed}/{operationalControlProgress.total}
                </span>
              </div>
            </div>

            {/* Care */}
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-medium">Handover of Care</p>
              </div>
              <div className="flex items-center justify-between">
                <Progress 
                  value={careProgress.total > 0 
                    ? (careProgress.completed / careProgress.total) * 100 
                    : 0} 
                  className="h-1.5 flex-1 mr-3" 
                />
                <span className="text-xs text-muted-foreground">
                  {careProgress.completed}/{careProgress.total}
                </span>
              </div>
            </div>
          </div>

          {/* Deviations Warning */}
          {deviations.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg mt-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>{deviations.length} deviation(s)</strong> require follow-up action
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approvers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Approval Chain ({approvers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No approvers configured</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {approvers.map((approver, index) => (
                <Badge key={approver.id} variant="outline" className="py-1.5">
                  <span className="font-medium mr-1">{index + 1}.</span>
                  {approver.roleName}
                  {approver.userId && (
                    <span className="text-primary ml-1">✓</span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
