import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Users,
  UserCheck,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardApprover {
  id: string;
  role_name: string;
  display_order: number;
}

const DEFAULT_APPROVERS: WizardApprover[] = [
  { id: 'approver-1', role_name: 'Project Hub Lead', display_order: 1 },
  { id: 'approver-2', role_name: 'ORA Lead', display_order: 2 },
  { id: 'approver-3', role_name: 'CSU Lead', display_order: 3 },
  { id: 'approver-4', role_name: 'Construction Lead', display_order: 4 },
  { id: 'approver-5', role_name: 'Deputy Plant Director', display_order: 5 },
];

interface ApprovalSetupStepProps {
  approvers: WizardApprover[];
  onApproversChange: (approvers: WizardApprover[]) => void;
}

export const ApprovalSetupStep: React.FC<ApprovalSetupStepProps> = ({
  approvers,
  onApproversChange,
}) => {
  const [newRoleName, setNewRoleName] = useState('');

  // Initialize with defaults if empty
  React.useEffect(() => {
    if (approvers.length === 0) {
      onApproversChange(DEFAULT_APPROVERS);
    }
  }, [approvers.length, onApproversChange]);

  const handleAddApprover = () => {
    if (!newRoleName.trim()) return;

    const newApprover: WizardApprover = {
      id: `approver-${Date.now()}`,
      role_name: newRoleName.trim(),
      display_order: approvers.length + 1,
    };

    onApproversChange([...approvers, newApprover]);
    setNewRoleName('');
  };

  const handleRemoveApprover = (id: string) => {
    const updated = approvers
      .filter(a => a.id !== id)
      .map((a, i) => ({ ...a, display_order: i + 1 }));
    onApproversChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...approvers];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onApproversChange(updated.map((a, i) => ({ ...a, display_order: i + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === approvers.length - 1) return;
    const updated = [...approvers];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onApproversChange(updated.map((a, i) => ({ ...a, display_order: i + 1 })));
  };

  const handleResetToDefault = () => {
    onApproversChange(DEFAULT_APPROVERS);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Approval Workflow</h3>
          <p className="text-xs text-muted-foreground">
            Configure the approval chain for this P2A Plan
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetToDefault}
          className="text-xs"
        >
          Reset to Default
        </Button>
      </div>

      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
        <div className="flex items-start gap-2">
          <Users className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-400">
            <strong>Sequential Approval:</strong> Each approver will receive a task notification 
            after the previous approver signs off. The plan becomes active once all approvers complete their review.
          </div>
        </div>
      </div>

      {/* Approvers List */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[280px]">
          <div className="p-2 space-y-2">
            {approvers.map((approver, index) => (
              <div
                key={approver.id}
                className="flex items-center gap-2 p-3 rounded-lg border bg-card"
              >
                <div className="flex flex-col gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5"
                    disabled={index === approvers.length - 1}
                    onClick={() => handleMoveDown(index)}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                  {index + 1}
                </div>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{approver.role_name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleRemoveApprover(approver.id)}
                  disabled={approvers.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Add New Approver */}
      <div className="flex gap-2">
        <Input
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          placeholder="Enter role name (e.g., Safety Manager)"
          className="h-9 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleAddApprover()}
        />
        <Button
          size="sm"
          onClick={handleAddApprover}
          disabled={!newRoleName.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Summary */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="text-xs text-muted-foreground">
          <strong>{approvers.length}</strong> approvers in sequence. 
          Estimated review time: <strong>{approvers.length * 2}-{approvers.length * 5} days</strong>
        </div>
      </div>
    </div>
  );
};
