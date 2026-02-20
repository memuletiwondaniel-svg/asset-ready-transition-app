import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, RotateCcw, Sparkles } from 'lucide-react';
import WizardStepApprovers from './WizardStepApprovers';

interface WizardStepApproversSetupProps {
  // PSSR Approvers
  selectedPssrApproverRoleIds: string[];
  onPssrApproverToggle: (roleId: string) => void;
  isPssrApproversModified: boolean;
  onResetPssrApprovers: () => void;

  // SoF Approvers
  selectedSofApproverRoleIds: string[];
  onSofApproverToggle: (roleId: string) => void;
  isSofApproversModified: boolean;
  onResetSofApprovers: () => void;

  // Location context
  plantName?: string;
}

const WizardStepApproversSetup: React.FC<WizardStepApproversSetupProps> = ({
  selectedPssrApproverRoleIds,
  onPssrApproverToggle,
  isPssrApproversModified,
  onResetPssrApprovers,
  selectedSofApproverRoleIds,
  onSofApproverToggle,
  isSofApproversModified,
  onResetSofApprovers,
  plantName,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Approval Setup</h3>
        <p className="text-sm text-muted-foreground">
          Configure PSSR and Statement of Fitness (SoF) approvers
        </p>
      </div>

      {/* PSSR Approvers */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">PSSR Approvers</span>
            <Badge variant="secondary" className="text-xs">
              {selectedPssrApproverRoleIds.length} roles
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isPssrApproversModified ? (
              <>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
                  Modified
                </Badge>
                <Button variant="ghost" size="sm" onClick={onResetPssrApprovers} className="text-xs h-7">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </>
            ) : (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700">
                <Sparkles className="h-3 w-3 mr-1" />
                From Template
              </Badge>
            )}
          </div>
        </div>
        <WizardStepApprovers
          type="pssr"
          selectedRoleIds={selectedPssrApproverRoleIds}
          disabledRoleIds={selectedSofApproverRoleIds}
          onRoleToggle={onPssrApproverToggle}
          plantName={plantName}
        />
      </div>

      {/* SoF Approvers */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" />
            <span className="font-medium text-sm">SoF Approvers</span>
            <Badge variant="secondary" className="text-xs">
              {selectedSofApproverRoleIds.length} roles
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isSofApproversModified ? (
              <>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
                  Modified
                </Badge>
                <Button variant="ghost" size="sm" onClick={onResetSofApprovers} className="text-xs h-7">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </>
            ) : (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700">
                <Sparkles className="h-3 w-3 mr-1" />
                From Template
              </Badge>
            )}
          </div>
        </div>
        <WizardStepApprovers
          type="sof"
          selectedRoleIds={selectedSofApproverRoleIds}
          disabledRoleIds={selectedPssrApproverRoleIds}
          onRoleToggle={onSofApproverToggle}
          plantName={plantName}
        />
      </div>

      {/* Validation Note */}
      {(selectedPssrApproverRoleIds.length === 0 || selectedSofApproverRoleIds.length === 0) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
          <p className="text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> Please select at least one approver for both PSSR and SoF.
          </p>
        </div>
      )}
    </div>
  );
};

export default WizardStepApproversSetup;
