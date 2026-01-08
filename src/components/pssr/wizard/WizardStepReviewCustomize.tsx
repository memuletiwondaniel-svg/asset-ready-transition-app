import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileCheck, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Target,
  RotateCcw,
  Plus,
  Sparkles
} from 'lucide-react';
import WizardStepChecklistItems, { ChecklistItemOverrides } from './WizardStepChecklistItems';
import WizardStepApprovers from './WizardStepApprovers';
import { ChecklistItemOverride } from './ChecklistItemEditDialog';
import { usePSSRChecklistItems, usePSSRChecklistCategories } from '@/hooks/usePSSRChecklistLibrary';
import { useRoles } from '@/hooks/useRoles';

interface LocationDisplay {
  type: string;
  primary: string;
  secondary?: string;
  details?: string[];
}

interface WizardStepReviewCustomizeProps {
  // Basic info for summary
  categoryName: string;
  reasonName: string;
  locationDisplay: LocationDisplay;
  scopeDescription?: string;
  atiScopes?: Array<{ id: string; code: string }>;
  
  // Checklist items
  selectedChecklistItemIds: string[];
  checklistItemOverrides: ChecklistItemOverrides;
  onChecklistItemToggle: (itemId: string) => void;
  onSelectAllChecklistItems: (itemIds: string[]) => void;
  onDeselectAllChecklistItems: () => void;
  onChecklistItemOverrideChange: (itemId: string, override: ChecklistItemOverride) => void;
  onChecklistItemOverrideReset: (itemId: string) => void;
  
  // PSSR Approvers
  selectedPssrApproverRoleIds: string[];
  onPssrApproverToggle: (roleId: string) => void;
  
  // SoF Approvers
  selectedSofApproverRoleIds: string[];
  onSofApproverToggle: (roleId: string) => void;
  
  // Track if modified from template
  isChecklistModified: boolean;
  isPssrApproversModified: boolean;
  isSofApproversModified: boolean;
  
  // Reset handlers
  onResetChecklist: () => void;
  onResetPssrApprovers: () => void;
  onResetSofApprovers: () => void;
  
  isLoading?: boolean;
}

const WizardStepReviewCustomize: React.FC<WizardStepReviewCustomizeProps> = ({
  categoryName,
  reasonName,
  locationDisplay,
  scopeDescription,
  atiScopes,
  selectedChecklistItemIds,
  checklistItemOverrides,
  onChecklistItemToggle,
  onSelectAllChecklistItems,
  onDeselectAllChecklistItems,
  onChecklistItemOverrideChange,
  onChecklistItemOverrideReset,
  selectedPssrApproverRoleIds,
  onPssrApproverToggle,
  selectedSofApproverRoleIds,
  onSofApproverToggle,
  isChecklistModified,
  isPssrApproversModified,
  isSofApproversModified,
  onResetChecklist,
  onResetPssrApprovers,
  onResetSofApprovers,
  isLoading,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const { data: checklistItems = [] } = usePSSRChecklistItems();
  const { data: categories = [] } = usePSSRChecklistCategories();
  const { roles = [] } = useRoles();

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Get checklist category summary
  const getChecklistSummary = () => {
    const categoryCounts: Record<string, number> = {};
    selectedChecklistItemIds.forEach(itemId => {
      const item = checklistItems.find(i => i.id === itemId);
      if (item) {
        const category = categories.find(c => c.id === item.category);
        const categoryName = category?.name || 'Other';
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      }
    });
    return Object.entries(categoryCounts)
      .slice(0, 4)
      .map(([name, count]) => `${name}: ${count}`)
      .join(', ');
  };

  // Get role names for display
  const getPssrApproverNames = () => {
    return selectedPssrApproverRoleIds
      .map(id => roles.find(r => r.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const getSofApproverNames = () => {
    return selectedSofApproverRoleIds
      .map(id => roles.find(r => r.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading template configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <FileText className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Review & Customize</h3>
        <p className="text-sm text-muted-foreground">
          Review auto-assigned items and make adjustments if needed
        </p>
      </div>

      {/* Summary Panel */}
      <div className="bg-muted/20 rounded-lg p-4 border border-border/30 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-muted-foreground">Category:</span>
            <p className="font-medium">{categoryName || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Reason:</span>
            <p className="font-medium">{reasonName || '—'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Location ({locationDisplay.type}):</span>
            <p className="font-medium">{locationDisplay.primary}</p>
            {locationDisplay.secondary && (
              <p className="text-xs text-muted-foreground">{locationDisplay.secondary}</p>
            )}
          </div>
          {atiScopes && atiScopes.length > 0 && (
            <div className="col-span-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> ATI Scopes:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {atiScopes.map(scope => (
                  <span key={scope.id} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                    {scope.code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Checklist Items Section */}
      <Collapsible
        open={expandedSections.has('checklist')}
        onOpenChange={() => toggleSection('checklist')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors border">
            <div className="flex items-center gap-2">
              {expandedSections.has('checklist') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <FileCheck className="h-4 w-4 text-primary" />
              <span className="font-medium">PSSR Checklist Items</span>
              <Badge variant="secondary" className="text-xs">
                {selectedChecklistItemIds.length} selected
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {isChecklistModified ? (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
                  Modified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  From Template
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-2 border rounded-lg p-3">
            {isChecklistModified && (
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetChecklist();
                  }}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset to Template
                </Button>
              </div>
            )}
            <WizardStepChecklistItems
              selectedItemIds={selectedChecklistItemIds}
              itemOverrides={checklistItemOverrides}
              onItemToggle={onChecklistItemToggle}
              onSelectAllItems={onSelectAllChecklistItems}
              onDeselectAll={onDeselectAllChecklistItems}
              onItemOverrideChange={onChecklistItemOverrideChange}
              onItemOverrideReset={onChecklistItemOverrideReset}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Collapsed summary when not expanded */}
      {!expandedSections.has('checklist') && selectedChecklistItemIds.length > 0 && (
        <p className="text-xs text-muted-foreground ml-10 -mt-2">
          {getChecklistSummary()}...
        </p>
      )}

      {/* PSSR Approvers Section */}
      <Collapsible
        open={expandedSections.has('pssr-approvers')}
        onOpenChange={() => toggleSection('pssr-approvers')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors border">
            <div className="flex items-center gap-2">
              {expandedSections.has('pssr-approvers') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium">PSSR Approvers</span>
              <Badge variant="secondary" className="text-xs">
                {selectedPssrApproverRoleIds.length} roles
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {isPssrApproversModified ? (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
                  Modified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  From Template
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-2 border rounded-lg p-3">
            {isPssrApproversModified && (
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetPssrApprovers();
                  }}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset to Template
                </Button>
              </div>
            )}
            <WizardStepApprovers
              type="pssr"
              selectedRoleIds={selectedPssrApproverRoleIds}
              disabledRoleIds={selectedSofApproverRoleIds}
              onRoleToggle={onPssrApproverToggle}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Collapsed summary when not expanded */}
      {!expandedSections.has('pssr-approvers') && selectedPssrApproverRoleIds.length > 0 && (
        <p className="text-xs text-muted-foreground ml-10 -mt-2">
          {getPssrApproverNames()}
        </p>
      )}

      {/* SoF Approvers Section */}
      <Collapsible
        open={expandedSections.has('sof-approvers')}
        onOpenChange={() => toggleSection('sof-approvers')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors border">
            <div className="flex items-center gap-2">
              {expandedSections.has('sof-approvers') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Users className="h-4 w-4 text-violet-600" />
              <span className="font-medium">SoF Approvers</span>
              <Badge variant="secondary" className="text-xs">
                {selectedSofApproverRoleIds.length} roles
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {isSofApproversModified ? (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
                  Modified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  From Template
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-2 border rounded-lg p-3">
            {isSofApproversModified && (
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetSofApprovers();
                  }}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset to Template
                </Button>
              </div>
            )}
            <WizardStepApprovers
              type="sof"
              selectedRoleIds={selectedSofApproverRoleIds}
              disabledRoleIds={selectedPssrApproverRoleIds}
              onRoleToggle={onSofApproverToggle}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Collapsed summary when not expanded */}
      {!expandedSections.has('sof-approvers') && selectedSofApproverRoleIds.length > 0 && (
        <p className="text-xs text-muted-foreground ml-10 -mt-2">
          {getSofApproverNames()}
        </p>
      )}

      {/* Validation Note */}
      {(selectedChecklistItemIds.length === 0 || selectedPssrApproverRoleIds.length === 0 || selectedSofApproverRoleIds.length === 0) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
          <p className="text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> Please ensure at least one checklist item and at least one approver for both PSSR and SoF are selected.
          </p>
        </div>
      )}
    </div>
  );
};

export default WizardStepReviewCustomize;
