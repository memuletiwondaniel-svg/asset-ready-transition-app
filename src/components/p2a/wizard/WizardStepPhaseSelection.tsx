import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Award, Info } from 'lucide-react';

interface WizardStepPhaseSelectionProps {
  phase: 'PAC' | 'FAC';
  onPhaseChange: (phase: 'PAC' | 'FAC') => void;
}

export const WizardStepPhaseSelection: React.FC<WizardStepPhaseSelectionProps> = ({
  phase,
  onPhaseChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">Handover Phase Selection</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Select whether this is a Provisional Acceptance (PAC) or Final Acceptance (FAC) handover. 
                Each phase has different prerequisites and approval workflows.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Handover Phase *</Label>
        <RadioGroup
          value={phase}
          onValueChange={(value) => onPhaseChange(value as 'PAC' | 'FAC')}
          className="grid grid-cols-1 gap-4"
        >
          {/* PAC Option */}
          <Card 
            className={`cursor-pointer transition-all ${
              phase === 'PAC' 
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => onPhaseChange('PAC')}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <RadioGroupItem value="PAC" id="pac" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                      <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <Label htmlFor="pac" className="text-lg font-semibold cursor-pointer">
                        PAC - Provisional Acceptance Certificate
                      </Label>
                      <p className="text-xs text-muted-foreground">Handover of Operational Control & Care</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-3 text-sm text-muted-foreground">
                    <p>
                      <strong>Purpose:</strong> Initial handover from Project to Operations team with provisional acceptance criteria.
                    </p>
                    <p>
                      <strong>Key Activities:</strong> Handover of Operational CONTROL, Handover of CARE (Custody, Maintenance).
                    </p>
                    <p>
                      <strong>Warranty Period:</strong> Defects liability period begins after PAC.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAC Option */}
          <Card 
            className={`cursor-pointer transition-all ${
              phase === 'FAC' 
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => onPhaseChange('FAC')}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <RadioGroupItem value="FAC" id="fac" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                      <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <Label htmlFor="fac" className="text-lg font-semibold cursor-pointer">
                        FAC - Final Acceptance Certificate
                      </Label>
                      <p className="text-xs text-muted-foreground">Final handover with warranty transfer</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-3 text-sm text-muted-foreground">
                    <p>
                      <strong>Purpose:</strong> Complete and final handover with all defects addressed and warranty transfer.
                    </p>
                    <p>
                      <strong>Key Activities:</strong> Defects close-out verification, Final documentation, Warranty handover.
                    </p>
                    <p>
                      <strong>Outcome:</strong> Project closure and full transfer of responsibility to Asset team.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </RadioGroup>
      </div>
    </div>
  );
};
