import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { useProjects } from '@/hooks/useProjects';
import { Loader2, ClipboardList, Award } from 'lucide-react';

interface WizardStepProjectSelectionProps {
  projectId: string;
  phase: 'PAC' | 'FAC';
  onProjectChange: (projectId: string) => void;
  onPhaseChange: (phase: 'PAC' | 'FAC') => void;
}

export const WizardStepProjectSelection: React.FC<WizardStepProjectSelectionProps> = ({
  projectId,
  phase,
  onProjectChange,
  onPhaseChange,
}) => {
  const { projects, isLoading } = useProjects();

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Select Project *</Label>
        <Select value={projectId} onValueChange={onProjectChange}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Choose a project for handover..." />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading projects...</span>
              </div>
            ) : projects?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No projects available
              </div>
            ) : (
              projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {project.project_id_prefix}-{project.project_id_number}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span>{project.project_title}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Handover Phase Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Handover Phase *</Label>
        <RadioGroup
          value={phase}
          onValueChange={(value) => onPhaseChange(value as 'PAC' | 'FAC')}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <Card 
            className={`cursor-pointer transition-all ${
              phase === 'PAC' 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => onPhaseChange('PAC')}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <RadioGroupItem value="PAC" id="pac" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ClipboardList className="h-4 w-4 text-blue-500" />
                    <Label htmlFor="pac" className="font-semibold cursor-pointer">
                      PAC - Provisional Acceptance
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Initial handover from Project to Operations team with provisional acceptance criteria
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${
              phase === 'FAC' 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => onPhaseChange('FAC')}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <RadioGroupItem value="FAC" id="fac" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="h-4 w-4 text-green-500" />
                    <Label htmlFor="fac" className="font-semibold cursor-pointer">
                      FAC - Final Acceptance
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Complete handover with final acceptance certificate and warranty transfer
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </RadioGroup>
      </div>
    </div>
  );
};
